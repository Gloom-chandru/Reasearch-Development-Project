"""
Seed exactly 2 sections with 60 students in each (total 120 students).
Fills complete student details (register_number, full_name, department, section, email, active).
Sets enrollment_count = 0 and face embeddings = None (ready for face enrollment).
"""

import os
import sys

BACKEND = os.path.dirname(os.path.abspath(__file__))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

os.environ.setdefault("DATABASE_URL", "sqlite:///./classroom.db")
os.environ.setdefault("SECRET_KEY", "change-this-to-a-long-random-string-production")

import datetime
from app.database import SessionLocal, engine, Base
from app.models.student import Student
from app.models.classroom import Classroom
from app.models.subject import Subject
from app.models.enrollment import ClassroomEnrollment
from app.models.face_embedding import FaceEmbedding
from app.models.attendance import AttendanceRecord, AttendanceStatus, RecognitionDecision
from app.models.session import AttendanceSession, SessionStatus
from app.models.config import AttendanceConfiguration
from app.models.user import User

db = SessionLocal()

SECTION_A_STUDENTS = [
    ("22AIDS1A001", "Senthil Murugan", "senthil.murugan@vit.ac.in"),
    ("22AIDS1A002", "Meena Krishnan", "meena.krishnan@vit.ac.in"),
    ("22AIDS1A003", "Aarav Subramanian", "aarav.subramanian@vit.ac.in"),
    ("22AIDS1A004", "Shalini Venkatesh", "shalini.venkatesh@vit.ac.in"),
    ("22AIDS1A005", "Manoj Rajan", "manoj.rajan@vit.ac.in"),
    ("22AIDS1A006", "Revathi Sundaram", "revathi.sundaram@vit.ac.in"),
    ("22AIDS1A007", "Dinesh Pillai", "dinesh.pillai@vit.ac.in"),
    ("22AIDS1A008", "Sangeetha Natarajan", "sangeetha.natarajan@vit.ac.in"),
    ("22AIDS1A009", "Surya Shankar", "surya.shankar@vit.ac.in"),
    ("22AIDS1A010", "Keerthana Balasubramanian", "keerthana.bala@vit.ac.in"),
    ("22AIDS1A011", "Vijay Annamalai", "vijay.annamalai@vit.ac.in"),
    ("22AIDS1A012", "Kavitha Chandrasekaran", "kavitha.chandru@vit.ac.in"),
    ("22AIDS1A013", "Pradeep Ramasamy", "pradeep.ramasamy@vit.ac.in"),
    ("22AIDS1A014", "Deepika Govindan", "deepika.govindan@vit.ac.in"),
    ("22AIDS1A015", "Rajesh Thiruvenkatam", "rajesh.thiru@vit.ac.in"),
    ("22AIDS1A016", "Pavithra Arumugam", "pavithra.arumugam@vit.ac.in"),
    ("22AIDS1A017", "Naveen Muthukrishnan", "naveen.muthu@vit.ac.in"),
    ("22AIDS1A018", "Divya Palaniswamy", "divya.palaniswamy@vit.ac.in"),
    ("22AIDS1A019", "Sathish Sethupathi", "sathish.sethupathi@vit.ac.in"),
    ("22AIDS1A020", "Aishwarya Kuppusamy", "aishwarya.kuppusamy@vit.ac.in"),
    ("22AIDS1A021", "Deepak Ilangovan", "deepak.ilangovan@vit.ac.in"),
    ("22AIDS1A022", "Pooja Vaithiyanathan", "pooja.vaithy@vit.ac.in"),
    ("22AIDS1A023", "Arun Paramasivam", "arun.paramasivam@vit.ac.in"),
    ("22AIDS1A024", "Renuka Dhandapani", "renuka.dhandapani@vit.ac.in"),
    ("22AIDS1A025", "Ganesh Rajagopal", "ganesh.rajagopal@vit.ac.in"),
    ("22AIDS1A026", "Lavanya Manickam", "lavanya.manickam@vit.ac.in"),
    ("22AIDS1A027", "Harish Sivakumar", "harish.sivakumar@vit.ac.in"),
    ("22AIDS1A028", "Suganya Pandian", "suganya.pandian@vit.ac.in"),
    ("22AIDS1A029", "Muthu Velayutham", "muthu.velayutham@vit.ac.in"),
    ("22AIDS1A030", "Mythili Sridhar", "mythili.sridhar@vit.ac.in"),
    ("22AIDS1A031", "Siva Ramanathan", "siva.ramanathan@vit.ac.in"),
    ("22AIDS1A032", "Vani Kannan", "vani.kannan@vit.ac.in"),
    ("22AIDS1A033", "Balaji Parthasarathy", "balaji.parthasarathy@vit.ac.in"),
    ("22AIDS1A034", "Geetha Srinivasan", "geetha.srinivasan@vit.ac.in"),
    ("22AIDS1A035", "Anand Raghavan", "anand.raghavan@vit.ac.in"),
    ("22AIDS1A036", "Radha Narayanan", "radha.narayanan@vit.ac.in"),
    ("22AIDS1A037", "Krishnan Swaminathan", "krishnan.swaminathan@vit.ac.in"),
    ("22AIDS1A038", "Janani Varadarajan", "janani.varadarajan@vit.ac.in"),
    ("22AIDS1A039", "Vignesh Lakshmanan", "vignesh.lakshmanan@vit.ac.in"),
    ("22AIDS1A040", "Bhuvana Soundararajan", "bhuvana.soundar@vit.ac.in"),
    ("22AIDS1A041", "Dhanush Thyagarajan", "dhanush.thyagarajan@vit.ac.in"),
    ("22AIDS1A042", "Nandhini Devarajan", "nandhini.devarajan@vit.ac.in"),
    ("22AIDS1A043", "Venkat Alagappan", "venkat.alagappan@vit.ac.in"),
    ("22AIDS1A044", "Sowmiya Chidambaram", "sowmiya.chidambaram@vit.ac.in"),
    ("22AIDS1A045", "Gopal Chettiar", "gopal.chettiar@vit.ac.in"),
    ("22AIDS1A046", "Malathi Ganesan", "malathi.ganesan@vit.ac.in"),
    ("22AIDS1A047", "Praveen Kumaresan", "praveen.kumaresan@vit.ac.in"),
    ("22AIDS1A048", "Kowsalya Jagadeesan", "kowsalya.jagadeesan@vit.ac.in"),
    ("22AIDS1A049", "Ramesh Muthuvel", "ramesh.muthuvel@vit.ac.in"),
    ("22AIDS1A050", "Ananya Chandran", "ananya.chandran@vit.ac.in"),
    ("22AIDS1A051", "Selvam Veerappan", "selvam.veerappan@vit.ac.in"),
    ("22AIDS1A052", "Harini Viswanathan", "harini.viswanathan@vit.ac.in"),
    ("22AIDS1A053", "Thirumal Boopathi", "thirumal.boopathi@vit.ac.in"),
    ("22AIDS1A054", "Swetha Jayaraman", "swetha.jayaraman@vit.ac.in"),
    ("22AIDS1A055", "Karthik Padmanabhan", "karthik.padmanabhan@vit.ac.in"),
    ("22AIDS1A056", "Rithika Mohan", "rithika.mohan@vit.ac.in"),
    ("22AIDS1A057", "Vigneshwaran Gurumoorthy", "vigneshwaran.guru@vit.ac.in"),
    ("22AIDS1A058", "Varsha Balamurugan", "varsha.balamurugan@vit.ac.in"),
    ("22AIDS1A059", "Ashwin Santhanam", "ashwin.santhanam@vit.ac.in"),
    ("22AIDS1A060", "Nithya Kalyani", "nithya.kalyani@vit.ac.in"),
]

SECTION_B_STUDENTS = [
    ("22AIDS1B001", "Abishek Sengottaiyan", "abishek.sengottaiyan@vit.ac.in"),
    ("22AIDS1B002", "Bhavani Ramachandran", "bhavani.ramachandran@vit.ac.in"),
    ("22AIDS1B003", "Chandru Marimuthu", "chandru.marimuthu@vit.ac.in"),
    ("22AIDS1B004", "Dharani Loganathan", "dharani.loganathan@vit.ac.in"),
    ("22AIDS1B005", "Elango Palani", "elango.palani@vit.ac.in"),
    ("22AIDS1B006", "Fathima Zohra", "fathima.zohra@vit.ac.in"),
    ("22AIDS1B007", "Gowtham Nachiappan", "gowtham.nachiappan@vit.ac.in"),
    ("22AIDS1B008", "Hemalatha Duraisamy", "hemalatha.duraisamy@vit.ac.in"),
    ("22AIDS1B009", "Iniyan Tamilselvan", "iniyan.tamilselvan@vit.ac.in"),
    ("22AIDS1B010", "Jayashree Sampath", "jayashree.sampath@vit.ac.in"),
    ("22AIDS1B011", "Kishore Gunasekaran", "kishore.gunasekaran@vit.ac.in"),
    ("22AIDS1B012", "Logeshwari Thangavel", "logeshwari.thangavel@vit.ac.in"),
    ("22AIDS1B013", "Madhan Velusamy", "madhan.velusamy@vit.ac.in"),
    ("22AIDS1B014", "Nalini Thangadurai", "nalini.thangadurai@vit.ac.in"),
    ("22AIDS1B015", "Omprakash Kandasamy", "omprakash.kandasamy@vit.ac.in"),
    ("22AIDS1B016", "Priyadharshini Velu", "priyadharshini.velu@vit.ac.in"),
    ("22AIDS1B017", "Raghuvaran Sengottuvel", "raghuvaran.sengottuvel@vit.ac.in"),
    ("22AIDS1B018", "Sandhya Chinnasamy", "sandhya.chinnasamy@vit.ac.in"),
    ("22AIDS1B019", "Tarun Kulasekaran", "tarun.kulasekaran@vit.ac.in"),
    ("22AIDS1B020", "Uma Maheswari", "uma.maheswari@vit.ac.in"),
    ("22AIDS1B021", "Vasanth Dharmalingam", "vasanth.dharmalingam@vit.ac.in"),
    ("22AIDS1B022", "Yamuna Kalidass", "yamuna.kalidass@vit.ac.in"),
    ("22AIDS1B023", "Yogesh Arulmozhi", "yogesh.arulmozhi@vit.ac.in"),
    ("22AIDS1B024", "Akshaya Kathirvel", "akshaya.kathirvel@vit.ac.in"),
    ("22AIDS1B025", "Balamurugan Natesan", "balamurugan.natesan@vit.ac.in"),
    ("22AIDS1B026", "Chitra Ponnumani", "chitra.ponnumani@vit.ac.in"),
    ("22AIDS1B027", "Devanathan Ramalingam", "devanathan.ramalingam@vit.ac.in"),
    ("22AIDS1B028", "Ezhilarasi Shanmugam", "ezhilarasi.shanmugam@vit.ac.in"),
    ("22AIDS1B029", "Giridharan Subramani", "giridharan.subramani@vit.ac.in"),
    ("22AIDS1B030", "Hema Malini", "hema.malini@vit.ac.in"),
    ("22AIDS1B031", "Ilayaraja Thangaraj", "ilayaraja.thangaraj@vit.ac.in"),
    ("22AIDS1B032", "Jeevitha Senthilvel", "jeevitha.senthilvel@vit.ac.in"),
    ("22AIDS1B033", "Kabilan Pandiarajan", "kabilan.pandiarajan@vit.ac.in"),
    ("22AIDS1B034", "Latha Madasamy", "latha.madasamy@vit.ac.in"),
    ("22AIDS1B035", "Manikandan Vellaisamy", "manikandan.vellaisamy@vit.ac.in"),
    ("22AIDS1B036", "Nivedha Muthuraj", "nivedha.muthuraj@vit.ac.in"),
    ("22AIDS1B037", "Parthiban Vairavan", "parthiban.vairavan@vit.ac.in"),
    ("22AIDS1B038", "Ramya Vijayakumar", "ramya.vijayakumar@vit.ac.in"),
    ("22AIDS1B039", "Saravanan Thirunavukkarasu", "saravanan.thiru@vit.ac.in"),
    ("22AIDS1B040", "Thenmozhi Selladurai", "thenmozhi.selladurai@vit.ac.in"),
    ("22AIDS1B041", "Udhayakumar Velusamy", "udhayakumar.velusamy@vit.ac.in"),
    ("22AIDS1B042", "Vidhya Thiyagarajan", "vidhya.thiyagarajan@vit.ac.in"),
    ("22AIDS1B043", "Yuvraj Arumuga", "yuvraj.arumuga@vit.ac.in"),
    ("22AIDS1B044", "Archana Marudharaj", "archana.marudharaj@vit.ac.in"),
    ("22AIDS1B045", "Bharathwaj Sethuraman", "bharathwaj.sethuraman@vit.ac.in"),
    ("22AIDS1B046", "Charumathi Rajendran", "charumathi.rajendran@vit.ac.in"),
    ("22AIDS1B047", "Damodaran Vasan", "damodaran.vasan@vit.ac.in"),
    ("22AIDS1B048", "Gokulnath Somasundaram", "gokulnath.somasundaram@vit.ac.in"),
    ("22AIDS1B049", "Ishwarya Jayakumar", "ishwarya.jayakumar@vit.ac.in"),
    ("22AIDS1B050", "Jayanth Chellappan", "jayanth.chellappan@vit.ac.in"),
    ("22AIDS1B051", "Kavin Sundarraj", "kavin.sundarraj@vit.ac.in"),
    ("22AIDS1B052", "Monisha Periyasamy", "monisha.periyasamy@vit.ac.in"),
    ("22AIDS1B053", "Nitin Balasundaram", "nitin.balasundaram@vit.ac.in"),
    ("22AIDS1B054", "Pavithran Veerakumar", "pavithran.veerakumar@vit.ac.in"),
    ("22AIDS1B055", "Rohith Thirupathi", "rohith.thirupathi@vit.ac.in"),
    ("22AIDS1B056", "Sneha Ravichandran", "sneha.ravichandran@vit.ac.in"),
    ("22AIDS1B057", "Tamilselvan Anbazhagan", "tamilselvan.anbazhagan@vit.ac.in"),
    ("22AIDS1B058", "Vaishnavi Venkatesan", "vaishnavi.venkatesan@vit.ac.in"),
    ("22AIDS1B059", "Yuvan Shankar", "yuvan.shankar@vit.ac.in"),
    ("22AIDS1B060", "Zoya Parveen", "zoya.parveen@vit.ac.in"),
]

def main():
    print("1. Cleaning old student records, enrollments, face embeddings, and attendance records...")
    db.query(FaceEmbedding).delete()
    db.query(AttendanceRecord).delete()
    db.query(ClassroomEnrollment).delete()
    db.query(Student).delete()
    db.commit()

    admin = db.query(User).filter_by(username="admin").first()
    admin_id = admin.id if admin else None

    # Clean out placeholder classrooms not in active sections
    active_codes = ["AIDS-1A", "AIDS-1B"]
    old_classrooms = db.query(Classroom).filter(~Classroom.code.in_(active_codes)).all()
    for old_c in old_classrooms:
        db.query(AttendanceSession).filter_by(classroom_id=old_c.id).delete()
        db.query(AttendanceConfiguration).filter_by(classroom_id=old_c.id).delete()
        db.delete(old_c)
    db.commit()

    # Ensure Classrooms AIDS-1A and AIDS-1B exist with clear Section names
    cls_1a = db.query(Classroom).filter_by(code="AIDS-1A").first()
    if not cls_1a:
        cls_1a = Classroom(
            name="AI & DS - Section A",
            code="AIDS-1A",
            floor=1,
            capacity=60,
            entry_zone_x1=0.15,
            entry_zone_y1=0.10,
            entry_zone_x2=0.85,
            entry_zone_y2=0.90,
            is_active=True,
        )
        db.add(cls_1a)
    else:
        cls_1a.name = "AI & DS - Section A"
        cls_1a.floor = 1
        cls_1a.capacity = 60
        cls_1a.is_active = True

    cls_1b = db.query(Classroom).filter_by(code="AIDS-1B").first()
    if not cls_1b:
        cls_1b = Classroom(
            name="AI & DS - Section B",
            code="AIDS-1B",
            floor=1,
            capacity=60,
            entry_zone_x1=0.15,
            entry_zone_y1=0.10,
            entry_zone_x2=0.85,
            entry_zone_y2=0.90,
            is_active=True,
        )
        db.add(cls_1b)
    else:
        cls_1b.name = "AI & DS - Section B"
        cls_1b.floor = 1
        cls_1b.capacity = 60
        cls_1b.is_active = True
    db.commit()

    # Ensure AttendanceConfiguration is pre-validated
    for room in [cls_1a, cls_1b]:
        cfg = db.query(AttendanceConfiguration).filter_by(classroom_id=room.id).first()
        if not cfg:
            cfg = AttendanceConfiguration(
                classroom_id=room.id,
                section="Section A" if room.code == "AIDS-1A" else "Section B",
                recognition_threshold=0.40,
                min_face_size=50,
                blur_threshold=15.0,
                entry_zone_enabled=True,
                liveness_enabled=False,
                threshold_validated=True,
                is_active=True,
            )
            db.add(cfg)
        else:
            cfg.threshold_validated = True
            cfg.recognition_threshold = 0.40
    db.commit()

    # Ensure core subjects exist
    subj_101 = db.query(Subject).filter_by(code="AIDS-101").first()
    if not subj_101:
        subj_101 = Subject(name="Python Programming", code="AIDS-101", department="AIDS", is_active=True)
        db.add(subj_101)

    subj_102 = db.query(Subject).filter_by(code="AIDS-102").first()
    if not subj_102:
        subj_102 = Subject(name="Mathematics for AI", code="AIDS-102", department="AIDS", is_active=True)
        db.add(subj_102)
    db.commit()

    subjects = [subj_101, subj_102]

    print(f"2. Seeding Section A: {len(SECTION_A_STUDENTS)} students...")
    sec_a_student_objs = []
    for reg, name, email in SECTION_A_STUDENTS:
        s = Student(
            register_number=reg,
            full_name=name,
            department="AI & DS",
            section="Section A",
            email=email,
            is_active=True,
            enrollment_count=0,
        )
        db.add(s)
        db.flush()
        sec_a_student_objs.append(s)

        for subj in subjects:
            enr = ClassroomEnrollment(
                student_id=s.id,
                classroom_id=cls_1a.id,
                subject_id=subj.id,
                section="Section A",
                enrolled_by=admin_id,
                is_active=True,
            )
            db.add(enr)

    print(f"3. Seeding Section B: {len(SECTION_B_STUDENTS)} students...")
    sec_b_student_objs = []
    for reg, name, email in SECTION_B_STUDENTS:
        s = Student(
            register_number=reg,
            full_name=name,
            department="AI & DS",
            section="Section B",
            email=email,
            is_active=True,
            enrollment_count=0,
        )
        db.add(s)
        db.flush()
        sec_b_student_objs.append(s)

        for subj in subjects:
            enr = ClassroomEnrollment(
                student_id=s.id,
                classroom_id=cls_1b.id,
                subject_id=subj.id,
                section="Section B",
                enrolled_by=admin_id,
                is_active=True,
            )
            db.add(enr)

    db.commit()

    # 4. Clean old sessions and seed fresh active & scheduled sessions
    db.query(AttendanceSession).delete()
    db.commit()

    now = datetime.datetime.utcnow()
    # Session 1: Section A active session
    sess_a = AttendanceSession(
        classroom_id=cls_1a.id,
        subject_id=subj_101.id,
        faculty_id=admin_id,
        title="Python Programming — Lab (Section A)",
        scheduled_start=now - datetime.timedelta(minutes=20),
        scheduled_end=now + datetime.timedelta(minutes=40),
        late_start_offset=5,
        late_end_offset=15,
        status=SessionStatus.ACTIVE,
    )
    db.add(sess_a)

    # Session 2: Section B scheduled session
    sess_b = AttendanceSession(
        classroom_id=cls_1b.id,
        subject_id=subj_101.id,
        faculty_id=admin_id,
        title="Python Programming — Lab (Section B)",
        scheduled_start=now + datetime.timedelta(hours=1),
        scheduled_end=now + datetime.timedelta(hours=2),
        late_start_offset=5,
        late_end_offset=15,
        status=SessionStatus.SCHEDULED,
    )
    db.add(sess_b)

    # Session 3: Completed morning session for Section A with sample records
    sess_prev_a = AttendanceSession(
        classroom_id=cls_1a.id,
        subject_id=subj_102.id,
        faculty_id=admin_id,
        title="Mathematics for AI — Lecture (Section A)",
        scheduled_start=now - datetime.timedelta(hours=3),
        scheduled_end=now - datetime.timedelta(hours=2),
        late_start_offset=5,
        late_end_offset=15,
        status=SessionStatus.COMPLETED,
    )
    db.add(sess_prev_a)

    # Session 4: Completed morning session for Section B with sample records
    sess_prev_b = AttendanceSession(
        classroom_id=cls_1b.id,
        subject_id=subj_102.id,
        faculty_id=admin_id,
        title="Mathematics for AI — Lecture (Section B)",
        scheduled_start=now - datetime.timedelta(hours=3),
        scheduled_end=now - datetime.timedelta(hours=2),
        late_start_offset=5,
        late_end_offset=15,
        status=SessionStatus.COMPLETED,
    )
    db.add(sess_prev_b)
    db.flush()

    # Seed sample attendance for the completed sessions
    # Section A: 52 present, 8 absent
    for idx, s in enumerate(sec_a_student_objs):
        st = AttendanceStatus.PRESENT if idx < 52 else AttendanceStatus.ABSENT_UNMARKED
        rec = AttendanceRecord(
            student_id=s.id,
            session_id=sess_prev_a.id,
            status=st,
            recognition_decision=RecognitionDecision.MATCH if st == AttendanceStatus.PRESENT else RecognitionDecision.NOT_RECOGNIZED,
            similarity_score=0.88 if st == AttendanceStatus.PRESENT else None,
            captured_at=sess_prev_a.scheduled_start + datetime.timedelta(minutes=idx % 10 + 2),
        )
        db.add(rec)

    # Section B: 54 present, 6 absent
    for idx, s in enumerate(sec_b_student_objs):
        st = AttendanceStatus.PRESENT if idx < 54 else AttendanceStatus.ABSENT_UNMARKED
        rec = AttendanceRecord(
            student_id=s.id,
            session_id=sess_prev_b.id,
            status=st,
            recognition_decision=RecognitionDecision.MATCH if st == AttendanceStatus.PRESENT else RecognitionDecision.NOT_RECOGNIZED,
            similarity_score=0.91 if st == AttendanceStatus.PRESENT else None,
            captured_at=sess_prev_b.scheduled_start + datetime.timedelta(minutes=idx % 10 + 2),
        )
        db.add(rec)

    db.commit()

    total_students = db.query(Student).count()
    sec_a_count = db.query(Student).filter_by(section="Section A").count()
    sec_b_count = db.query(Student).filter_by(section="Section B").count()
    classrooms_count = db.query(Classroom).count()
    sessions_count = db.query(AttendanceSession).count()
    att_count = db.query(AttendanceRecord).count()

    print("\n=== SUCCESS ===")
    print(f"  Total Classrooms: {classrooms_count} (Section A and Section B)")
    print(f"  Total Students: {total_students}")
    print(f"  Section A: {sec_a_count}")
    print(f"  Section B: {sec_b_count}")
    print(f"  Total Sessions: {sessions_count}")
    print(f"  Attendance Records: {att_count}")

if __name__ == "__main__":
    main()
