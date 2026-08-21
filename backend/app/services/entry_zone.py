"""Entry-zone detection — 2D bounding-box centroid check.

A configurable 2D region of interest in the camera frame.
Only faces whose bounding-box centroid falls inside the zone are accepted.

This is a simplified 2D approximation, not 3D spatial security.
"""

from __future__ import annotations

from typing import Optional, Tuple

from app.models.classroom import Classroom


class EntryZoneDetector:
    """Detects whether a face bounding-box centroid falls within the entry zone."""

    def __init__(self, classroom: Optional[Classroom] = None):
        self.classroom = classroom

    def configure(self, classroom: Classroom) -> None:
        """Set the classroom configuration for entry zone coordinates."""
        self.classroom = classroom

    def check_face(
        self,
        face_box: Tuple[int, int, int, int],
        frame_width: int,
        frame_height: int,
    ) -> dict:
        """Check if a face bounding-box centroid is inside the entry zone.

        Args:
            face_box: (x, y, w, h) in pixels
            frame_width: Width of the frame in pixels
            frame_height: Height of the frame in pixels

        Returns:
            {
                "inside": bool,
                "centroid": (cx, cy) in normalized coordinates 0-1,
                "zone": (x1, y1, x2, y2) in normalized coordinates,
                "reason": str,
            }
        """
        x, y, w, h = face_box
        cx = (x + w / 2) / max(frame_width, 1)
        cy = (y + h / 2) / max(frame_height, 1)

        if self.classroom is None:
            return {
                "inside": True,
                "centroid": (round(cx, 4), round(cy, 4)),
                "zone": (0.0, 0.0, 1.0, 1.0),
                "reason": "No classroom configured — zone check disabled",
            }

        zx1, zy1 = self.classroom.entry_zone_x1, self.classroom.entry_zone_y1
        zx2, zy2 = self.classroom.entry_zone_x2, self.classroom.entry_zone_y2

        inside = (zx1 <= cx <= zx2) and (zy1 <= cy <= zy2)

        if inside:
            reason = f"Face centroid ({cx:.2f}, {cy:.2f}) inside entry zone"
        else:
            reason = (
                f"Face centroid ({cx:.2f}, {cy:.2f}) outside entry zone "
                f"[{zx1:.2f}, {zy1:.2f}] - [{zx2:.2f}, {zy2:.2f}]"
            )

        return {
            "inside": inside,
            "centroid": (round(cx, 4), round(cy, 4)),
            "zone": (round(zx1, 4), round(zy1, 4), round(zx2, 4), round(zy2, 4)),
            "reason": reason,
        }