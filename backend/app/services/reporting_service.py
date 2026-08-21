"""Excel reporting — generate downloadable attendance reports per session.

Uses pandas + openpyxl for structured Excel output.
"""

from __future__ import annotations

import io
import datetime
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.repositories.repository_sessions import (
    AttendanceRecordRepository,
    AttendanceSessionRepository,
)
from app.repositories.repository_core import StudentRepository
from app.utils.logging import logger


class ExcelReportService:
    """Generate Excel attendance reports."""

    def __init__(self, db: Session):
        self.db = db
        self.record_repo = AttendanceRecordRepository(db)
        self.session_repo = AttendanceSessionRepository(db)
        self.student_repo = StudentRepository(db)

    def generate_session_report(self, session_id: int) -> Optional[bytes]:
        """Generate an Excel report for a session.

        Returns the Excel file as bytes, or None if session not found.
        """
        session = self.session_repo.get(session_id)
        if not session:
            return None

        records = self.record_repo.get_records_by_session(session_id)
        data_rows = []

        for r in records:
            student = self.student_repo.get(r.student_id)
            data_rows.append({
                "Register Number": student.register_number if student else "N/A",
                "Name": student.full_name if student else "N/A",
                "Department": student.department if student else "N/A",
                "Section": student.section if student else "N/A",
                "Status": r.status.value if hasattr(r.status, 'value') else r.status,
                "Recognition Decision": r.recognition_decision.value if hasattr(r.recognition_decision, 'value') else r.recognition_decision,
                "Similarity Score": r.similarity_score,
                "Quality Label": r.quality_label,
                "Entry Zone": r.entry_zone_result,
                "Liveness": r.liveness_result,
                "Is Corrected": "Yes" if r.is_corrected else "No",
                "Captured At": str(r.captured_at),
            })

        df = pd.DataFrame(data_rows)

        # Summary statistics
        total = len(records)
        present = sum(1 for r in records if r.status == "present" or r.status.value == "present")
        late = sum(1 for r in records if r.status == "late" or r.status.value == "late")
        absent = sum(1 for r in records if r.status == "absent-unmarked" or r.status.value == "absent-unmarked")
        manual = sum(1 for r in records if r.status == "manual" or r.status.value == "manual")

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            # Write attendance detail
            df.to_excel(writer, sheet_name="Attendance Records", index=False)

            # Write summary
            summary_df = pd.DataFrame([
                {"Metric": "Session Title", "Value": session.title},
                {"Metric": "Date", "Value": str(session.scheduled_start.date())},
                {"Metric": "Scheduled Start", "Value": str(session.scheduled_start)},
                {"Metric": "Scheduled End", "Value": str(session.scheduled_end)},
                {"Metric": "Status", "Value": session.status.value if hasattr(session.status, 'value') else session.status},
                {"Metric": "Total Students", "Value": total},
                {"Metric": "Present", "Value": present},
                {"Metric": "Late", "Value": late},
                {"Metric": "Absent", "Value": absent},
                {"Metric": "Manual", "Value": manual},
                {"Metric": "Attendance %", "Value": round((present + late) / max(total, 1) * 100, 2)},
            ])
            summary_df.to_excel(writer, sheet_name="Summary", index=False)

            # Auto-adjust column widths
            worksheet = writer.sheets["Attendance Records"]
            for col in worksheet.columns:
                max_len = max(len(str(cell.value or "")) for cell in col)
                worksheet.column_dimensions[col[0].column_letter].width = max_len + 2

        output.seek(0)
        logger.info(f"Excel report generated for session={session_id} ({len(data_rows)} records)")
        return output.getvalue()

    def generate_student_report(self, student_id: int) -> Optional[bytes]:
        """Generate an Excel report for a single student across all sessions."""
        student = self.student_repo.get(student_id)
        if not student:
            return None

        from app.repositories.repository_sessions import AttendanceSessionRepository
        session_repo = AttendanceSessionRepository(self.db)
        all_sessions = session_repo.list(limit=500)
        data_rows = []

        for session in all_sessions:
            record = self.record_repo.get_by_student_and_session(student_id, session.id)
            data_rows.append({
                "Date": str(session.scheduled_start.date()),
                "Session": session.title,
                "Status": record.status.value if record and hasattr(record.status, 'value') else (record.status if record else "N/A"),
                "Decision": record.recognition_decision.value if record and hasattr(record.recognition_decision, 'value') else (record.recognition_decision if record else "N/A"),
                "Similarity": record.similarity_score if record else None,
            })

        df = pd.DataFrame(data_rows)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=f"{student.full_name} - Attendance", index=False)

        output.seek(0)
        return output.getvalue()