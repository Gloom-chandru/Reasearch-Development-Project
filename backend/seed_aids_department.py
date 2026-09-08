"""
Seed script — AI & Data Science Department
==========================================
Creates:
  • 8 Classrooms  : Year 1-4 × Section A & B
  • 10 Subjects   : Core AI&DS curriculum subjects
  • 4 Faculty users (one per year)
  • 240 Students  : 30 per classroom (8 classrooms × 30)
  • Classroom enrollments linking every student to their classroom + subjects
  • 1 Attendance Session per classroom (scheduled, ready to activate)
  • Sample notices for the department

All data is realistic Indian engineering college style — Tamil Nadu format
(register numbers, names, departments).

Run:
    cd backend
    python seed_aids_department.py
"""

from __future__ import annotations

import os
import sys
import random
from datetime import datetime, timedelta

# ── path setup ────────────────────────────────────────────────────────────────
BACKEND = os.path.dirname(os.path.abspath(__file__))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

os.environ.setdefault("DATABASE_URL", "sqlite:///./classroom.db")
os.environ.setdefault("SECRET_KEY", "change-this-to-a-long-random-string-production")

from app.database import SessionLocal, engine, Base
from app.models import *          # registers all models
from app.utils.security import hash_password
from app.utils.logging import logger

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── helpers ───────────────────────────────────────────────────────────────────

def _get_or_create(model, filter_kwargs, create_kwargs=None):
    obj = db.query(model).filter_by(**filter_kwargs).first()
    if obj:
        return obj, False
    obj = model(**(create_kwargs or filter_kwargs))
    db.add(obj)
    db.flush()
    return obj, True


# ══════════════════════════════════════════════════════════════════════════════
# 1. ADMIN USER (ensure exists)
# ══════════════════════════════════════════════════════════════════════════════
from app.models.user import User

admin, _ = _get_or_create(
    User,
    {"username": "admin"},
    {
        "username": "admin",
        "email": "admin@classroom.local",
        "hashed_password": hash_password("admin123"),
        "full_name": "System Administrator",
        "role": "super_admin",
        "is_active": True,
    },
)
db.commit()
print("✓ Admin user ready")

# ══════════════════════════════════════════════════════════════════════════════
# 2. FACULTY USERS (4 — one per year group)
# ══════════════════════════════════════════════════════════════════════════════

faculty_data = [
    ("dr_priya_aids",   "dr.priya@college.edu",   "Dr. Priya Venkataraman",   "faculty"),
    ("dr_rajan_aids",   "dr.rajan@college.edu",   "Dr. Rajan Subramaniam",    "faculty"),
    ("prof_meena_aids", "prof.meena@college.edu", "Prof. Meena Krishnamurthy","faculty"),
    ("prof_karthik_aids","prof.karthik@college.edu","Prof. Karthik Balasubramanian","faculty"),
    ("hod_aids",        "hod.aids@college.edu",   "Dr. Senthil Kumar (HOD)",  "hod"),
    ("coord_aids",      "coord.aids@college.edu", "Ms. Divya Coordinator",    "coordinator"),
]

faculty_users = {}
for uname, email, fullname, role in faculty_data:
    u, created = _get_or_create(
        User,
        {"username": uname},
        {
            "username": uname,
            "email": email,
            "hashed_password": hash_password("Faculty@123"),
            "full_name": fullname,
            "role": role,
            "is_active": True,
        },
    )
    faculty_users[uname] = u
    if created:
        print(f"  + User: {fullname} ({role})")

db.commit()
print(f"✓ {len(faculty_users)} faculty/staff users ready")

# ══════════════════════════════════════════════════════════════════════════════
# 3. CLASSROOMS — 4 years × 2 sections = 8 classrooms
# ══════════════════════════════════════════════════════════════════════════════

from app.models.classroom import Classroom

CLASSROOMS = [
    # (name, code, floor, capacity)
    ("AI&DS Year 1 - Section A", "AIDS-1A", 1, 60),
    ("AI&DS Year 1 - Section B", "AIDS-1B", 1, 60),
    ("AI&DS Year 2 - Section A", "AIDS-2A", 2, 60),
    ("AI&DS Year 2 - Section B", "AIDS-2B", 2, 60),
    ("AI&DS Year 3 - Section A", "AIDS-3A", 3, 60),
    ("AI&DS Year 3 - Section B", "AIDS-3B", 3, 60),
    ("AI&DS Year 4 - Section A", "AIDS-4A", 4, 60),
    ("AI&DS Year 4 - Section B", "AIDS-4B", 4, 60),
]

classroom_objs = {}
for name, code, floor, cap in CLASSROOMS:
    c, created = _get_or_create(
        Classroom,
        {"code": code},
        {
            "name": name, "code": code, "floor": floor, "capacity": cap,
            "entry_zone_x1": 0.15, "entry_zone_y1": 0.10,
            "entry_zone_x2": 0.85, "entry_zone_y2": 0.90,
            "is_active": True,
        },
    )
    classroom_objs[code] = c
    if created:
        print(f"  + Classroom: {name}")

db.commit()
print(f"✓ {len(classroom_objs)} classrooms ready")

# ══════════════════════════════════════════════════════════════════════════════
# 4. SUBJECTS — AI&DS curriculum
# ══════════════════════════════════════════════════════════════════════════════

from app.models.subject import Subject

SUBJECTS = [
    # (name, code, department, years)
    ("Python Programming",             "AIDS-101", "AIDS", [1]),
    ("Mathematics for AI",             "AIDS-102", "AIDS", [1]),
    ("Data Structures & Algorithms",   "AIDS-201", "AIDS", [2]),
    ("Machine Learning Fundamentals",  "AIDS-202", "AIDS", [2]),
    ("Deep Learning",                  "AIDS-301", "AIDS", [3]),
    ("Natural Language Processing",    "AIDS-302", "AIDS", [3]),
    ("Computer Vision",                "AIDS-303", "AIDS", [3]),
    ("Big Data Analytics",             "AIDS-401", "AIDS", [4]),
    ("AI Ethics & Governance",         "AIDS-402", "AIDS", [4]),
    ("Capstone Project",               "AIDS-403", "AIDS", [4]),
]

subject_objs = {}
for name, code, dept, years in SUBJECTS:
    s, created = _get_or_create(
        Subject,
        {"code": code},
        {"name": name, "code": code, "department": dept, "is_active": True},
    )
    subject_objs[code] = (s, years)
    if created:
        print(f"  + Subject: {name} ({code})")

db.commit()
print(f"✓ {len(subject_objs)} subjects ready")

# ══════════════════════════════════════════════════════════════════════════════
# 5. STUDENTS — 30 per classroom = 240 total
# ══════════════════════════════════════════════════════════════════════════════

from app.models.student import Student
from app.models.enrollment import ClassroomEnrollment

# Tamil Nadu style first names and surnames
FIRST_NAMES_M = [
    "Aarav","Arjun","Karthik","Pradeep","Vijay","Suresh","Rajesh","Dinesh",
    "Manoj","Sathish","Naveen","Deepak","Arun","Ganesh","Harish","Muthu",
    "Siva","Balaji","Anand","Krishnan","Senthil","Vignesh","Dhanush","Surya",
    "Venkat","Gopal","Praveen","Ramesh","Selvam","Thirumal",
]
FIRST_NAMES_F = [
    "Priya","Divya","Kavitha","Meena","Sangeetha","Lakshmi","Anu","Revathi",
    "Nithya","Deepika","Pavithra","Saranya","Keerthana","Aishwarya","Brindha",
    "Pooja","Renuka","Lavanya","Suganya","Mythili","Vani","Geetha","Radha",
    "Shalini","Janani","Bhuvana","Nandhini","Sowmiya","Malathi","Kowsalya",
]
SURNAMES = [
    "Murugan","Krishnan","Subramanian","Venkatesh","Rajan","Sundaram","Pillai",
    "Natarajan","Shankar","Balasubramanian","Annamalai","Chandrasekaran",
    "Ramasamy","Govindan","Thiruvenkatam","Arumugam","Muthukrishnan",
    "Palaniswamy","Sethupathi","Kuppusamy","Ilangovan","Vaithiyanathan",
    "Paramasivam","Dhandapani","Rajagopal","Manickam","Sivakumar",
    "Subramaniam","Pandian","Velayutham",
]

random.seed(42)  # reproducible

def make_register(year: int, section: str, idx: int, batch: int = 2022) -> str:
    """Format: 22AIDS1A001 — batch + dept + year + section + 3-digit serial"""
    batch_short = str(batch)[-2:]
    return f"{batch_short}AIDS{year}{section}{idx:03d}"

def make_email(name: str, reg: str) -> str:
    clean = name.lower().replace(" ", ".").replace(".", "")[:12]
    return f"{clean}.{reg[-5:]}@student.college.edu"

students_created = 0
enrollment_created = 0
BATCH_START = 2022  # first-year batch year

for code, classroom in classroom_objs.items():
    year = int(code[5])          # AIDS-1A → 1
    section = code[6]            # AIDS-1A → A
    batch = BATCH_START - (year - 1)   # Year 1 = 2022, Year 2 = 2021, etc.

    # Subjects for this year
    year_subjects = [
        (sc, (sobj, yrs)) for sc, (sobj, yrs) in subject_objs.items()
        if year in yrs
    ]

    for idx in range(1, 31):   # 30 students per class
        # Alternate gender roughly 50/50
        if idx % 2 == 0:
            first = random.choice(FIRST_NAMES_F)
        else:
            first = random.choice(FIRST_NAMES_M)
        surname = SURNAMES[(idx - 1) % len(SURNAMES)]
        full_name = f"{first} {surname}"
        reg = make_register(year, section, idx, batch)
        email = make_email(full_name, reg)

        student, s_created = _get_or_create(
            Student,
            {"register_number": reg},
            {
                "register_number": reg,
                "full_name": full_name,
                "department": "AI & Data Science",
                "section": section,
                "email": email,
                "is_active": True,
                "enrollment_count": 0,
            },
        )
        if s_created:
            students_created += 1

        # Enroll in classroom (for each subject of this year)
        for subj_code, (subj_obj, _) in year_subjects:
            enr = (
                db.query(ClassroomEnrollment)
                .filter_by(
                    student_id=student.id,
                    classroom_id=classroom.id,
                    subject_id=subj_obj.id,
                )
                .first()
            )
            if not enr:
                enr = ClassroomEnrollment(
                    student_id=student.id,
                    classroom_id=classroom.id,
                    subject_id=subj_obj.id,
                    section=section,
                    enrolled_by=admin.id,
                    is_active=True,
                )
                db.add(enr)
                enrollment_created += 1

    db.commit()
    print(f"  ✓ Classroom {code}: 30 students enrolled")

print(f"\n✓ Students created: {students_created}")
print(f"✓ Enrollments created: {enrollment_created}")

# ══════════════════════════════════════════════════════════════════════════════
# 6. ATTENDANCE SESSIONS — one scheduled session per classroom
# ══════════════════════════════════════════════════════════════════════════════

from app.models.session import AttendanceSession

SESSION_CONFIG = [
    # (classroom_code, subject_code, faculty_username, title)
    ("AIDS-1A", "AIDS-101", "dr_priya_aids",    "Python Programming — Lab 1"),
    ("AIDS-1B", "AIDS-101", "dr_rajan_aids",    "Python Programming — Lab 1"),
    ("AIDS-2A", "AIDS-201", "dr_priya_aids",    "DSA — Lecture 5"),
    ("AIDS-2B", "AIDS-202", "dr_rajan_aids",    "Machine Learning — Lab 2"),
    ("AIDS-3A", "AIDS-301", "prof_meena_aids",  "Deep Learning — Lecture 8"),
    ("AIDS-3B", "AIDS-302", "prof_karthik_aids","NLP — Lab 3"),
    ("AIDS-4A", "AIDS-401", "prof_meena_aids",  "Big Data — Workshop"),
    ("AIDS-4B", "AIDS-403", "prof_karthik_aids","Capstone — Review Session"),
]

now = datetime.utcnow()
sessions_created = 0

for cls_code, subj_code, fac_uname, title in SESSION_CONFIG:
    classroom = classroom_objs[cls_code]
    subject, _ = subject_objs[subj_code]
    faculty = faculty_users[fac_uname]

    start = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    end   = start + timedelta(hours=1, minutes=30)

    exists = (
        db.query(AttendanceSession)
        .filter_by(classroom_id=classroom.id, subject_id=subject.id, title=title)
        .first()
    )
    if not exists:
        sess = AttendanceSession(
            classroom_id=classroom.id,
            subject_id=subject.id,
            faculty_id=faculty.id,
            title=title,
            scheduled_start=start,
            scheduled_end=end,
            late_start_offset=10,
            late_end_offset=15,
            status="scheduled",
        )
        db.add(sess)
        sessions_created += 1

db.commit()
print(f"\n✓ Attendance sessions created: {sessions_created}")

# ══════════════════════════════════════════════════════════════════════════════
# 7. NOTICES
# ══════════════════════════════════════════════════════════════════════════════

from app.models.notice import Notice

NOTICES = [
    (
        "Welcome to AI&DS Department",
        "Welcome to the Smart Classroom System! Attendance will be marked automatically "
        "using facial recognition. Please ensure your face is enrolled by visiting the "
        "Admin Portal and requesting enrollment from your faculty coordinator.",
        0, None,
    ),
    (
        "Face Enrollment Mandatory — Deadline: Friday",
        "All AI&DS students must complete face enrollment by this Friday. Students without "
        "face enrollment will be marked absent automatically. Contact your class coordinator "
        "if you face any issues.",
        2, None,
    ),
    (
        "AI&DS Department Symposium — 15th September",
        "The annual AI&DS Symposium will be held on September 15th. All final-year students "
        "must submit their project abstracts by September 10th. Attendance is mandatory for "
        "all years. No regular classes on symposium day.",
        1, None,
    ),
    (
        "Lab Timings Updated",
        "Deep Learning Lab (AIDS-3A/3B) timings have been updated to 2:00 PM – 5:00 PM "
        "on Tuesdays and Thursdays effective immediately. Please update your timetables.",
        1, None,
    ),
]

notices_created = 0
hod = faculty_users["hod_aids"]
valid_from = now
valid_until = now + timedelta(days=30)

for title, body, priority, cls_id in NOTICES:
    exists = db.query(Notice).filter_by(title=title, created_by=hod.id).first()
    if not exists:
        n = Notice(
            title=title,
            body=body,
            priority=priority,
            classroom_id=cls_id,
            created_by=hod.id,
            valid_from=valid_from,
            valid_until=valid_until,
            is_active=True,
        )
        db.add(n)
        notices_created += 1

db.commit()
print(f"✓ Notices created: {notices_created}")

# ══════════════════════════════════════════════════════════════════════════════
# 8. SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

total_students = db.query(Student).filter_by(department="AI & Data Science").count()
total_classrooms = db.query(Classroom).count()
total_sessions = db.query(AttendanceSession).count()
total_subjects = db.query(Subject).count()
total_enrollments = db.query(ClassroomEnrollment).count()
total_users = db.query(User).count()
total_notices = db.query(Notice).count()

print("\n" + "═" * 55)
print("  SEED COMPLETE — AI & Data Science Department")
print("═" * 55)
print(f"  Users          : {total_users} (admin + HOD + coordinator + 4 faculty)")
print(f"  Classrooms     : {total_classrooms} (Year 1–4, Section A & B)")
print(f"  Subjects       : {total_subjects}")
print(f"  Students       : {total_students} (30 per classroom × 8)")
print(f"  Enrollments    : {total_enrollments}")
print(f"  Sessions       : {total_sessions} (1 per classroom, scheduled)")
print(f"  Notices        : {total_notices}")
print("═" * 55)
print("  Default login  : admin / admin123")
print("  Faculty login  : dr_priya_aids / Faculty@123")
print("  HOD login      : hod_aids / Faculty@123")
print("═" * 55)

db.close()
