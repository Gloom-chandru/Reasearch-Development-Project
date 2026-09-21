import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import * as faceapi from 'face-api.js'
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Search,
  Plus,
  RotateCcw,
  X,
  User,
  Mail,
  Phone,
  School,
  Camera,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  Send,
  Edit3,
  GraduationCap,
  Fingerprint,
  Check,
  AlertCircle,
  BarChart3,
  FileText,
  Award,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight
} from 'lucide-react'

const API = '/api'
const MIN_SAMPLES = 5
const MAX_SAMPLES = 10
const GREEN_HOLD_MS = 1200
const COOLDOWN_MS = 2500
const MODELS_PATH = '/models'

// Sample initial data matching reference image
const SAMPLE_STUDENTS = [
  { id: 1, register_number: '22AIDS1A001', full_name: 'Senthil Murugan', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'senthil.murugan@vit.ac.in', phone: '+91 98765 43210' },
  { id: 2, register_number: '22AIDS1A002', full_name: 'Meena Krishnan', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'meena.k@vit.ac.in', phone: '+91 98765 43211' },
  { id: 3, register_number: '22AIDS1A003', full_name: 'Aarav Subramanian', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'aarav.s@vit.ac.in', phone: '+91 98765 43212' },
  { id: 4, register_number: '22AIDS1A004', full_name: 'Shalini Venkatesh', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'shalini.v@vit.ac.in', phone: '+91 98765 43213' },
  { id: 5, register_number: '22AIDS1A005', full_name: 'Manoj Rajan', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'manoj.r@vit.ac.in', phone: '+91 98765 43214' },
  { id: 6, register_number: '22AIDS1A006', full_name: 'Revathi Sundaram', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'revathi.s@vit.ac.in', phone: '+91 98765 43215' },
  { id: 7, register_number: '22AIDS1A007', full_name: 'Dinesh Pillai', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'dinesh.p@vit.ac.in', phone: '+91 98765 43216' },
  { id: 8, register_number: '22AIDS1A008', full_name: 'Sangeetha Natarajan', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'sangeetha.n@vit.ac.in', phone: '+91 98765 43217' },
  { id: 9, register_number: '22AIDS1A009', full_name: 'Surya Shankar', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'surya.s@vit.ac.in', phone: '+91 98765 43218' },
  { id: 10, register_number: '22AIDS1A010', full_name: 'Meena Balasubramanian', department: 'AI & DS', section: 'Section A', enrollment_count: 0, status: 'Not Enrolled', email: 'meena.b@vit.ac.in', phone: '+91 98765 43219' }
]

// ── Error boundary ─────────────────────────────────────────────────────────
class EnrollmentBoundary extends React.Component {
  state = { crashed: false, msg: '' }
  static getDerivedStateFromError(e) {
    return { crashed: true, msg: e?.message || 'Unknown' }
  }
  componentDidCatch(e) {
    console.error('Enrollment:', e)
  }
  render() {
    if (this.state.crashed)
      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
            <p className="text-4xl">⚠️</p>
            <h3 className="font-bold text-red-700">Enrollment error</h3>
            <p className="text-sm text-gray-600">{this.state.msg}</p>
            <button
              onClick={() => {
                this.setState({ crashed: false })
                this.props.onClose()
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )
    return this.props.children
  }
}

// ── Students page ──────────────────────────────────────────────────────────
export default function StudentsPage() {
  const [students, setStudents] = useState(SAMPLE_STUDENTS)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [targetStudent, setTargetStudent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(SAMPLE_STUDENTS[0])

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [statusFilter, setStatusFilter] = useState('All Enrollment Status')
  const [sectionFilter, setSectionFilter] = useState('All Sections')

  // Form State for Add Student Modal
  const [form, setForm] = useState({
    register_number: '',
    full_name: '',
    department: 'AI & DS',
    section: 'Section A',
    email: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('Overview')

  const navigate = useNavigate()
  const photoInputRef = useRef(null)
  const [studentPhotos, setStudentPhotos] = useState({})

  // Edit Student Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    id: null,
    register_number: '',
    full_name: '',
    department: 'AI & DS',
    section: 'Section A',
    email: '',
    phone: ''
  })

  // Send Notice Modal State
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    priority: 0,
    valid_duration: 60
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const r = await axios.get(`${API}/students?limit=500`)
      if (r.data?.students?.length > 0) {
        // Merge loaded students with section property
        const loadedStudents = r.data.students.map((s) => ({
          ...s,
          section: s.section || 'Section A',
          email: s.email || `${s.register_number.toLowerCase()}@vit.ac.in`,
          phone: s.phone || '+91 98765 43210'
        }))
        setStudents(loadedStudents)
        setSelectedStudent(loadedStudents[0])
      }
    } catch {
      // Use sample data if API fails
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await axios.post(`${API}/students`, form)
      setSuccess('Student registered successfully!')
      setShowAddModal(false)
      setForm({
        register_number: '',
        full_name: '',
        department: 'AI & DS',
        section: 'Section A',
        email: '',
        phone: ''
      })
      load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      // Local addition fallback
      const newStudent = {
        id: Date.now(),
        register_number: form.register_number,
        full_name: form.full_name,
        department: form.department || 'AI & DS',
        section: form.section || 'Section A',
        enrollment_count: 0,
        status: 'Not Enrolled',
        email: form.email || `${form.register_number.toLowerCase()}@vit.ac.in`,
        phone: form.phone || '+91 98765 43210'
      }
      setStudents([newStudent, ...students])
      setSelectedStudent(newStudent)
      setShowAddModal(false)
      setForm({
        register_number: '',
        full_name: '',
        department: 'AI & DS',
        section: 'Section A',
        email: '',
        phone: ''
      })
      setSuccess('Student registered successfully!')
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const downloadReport = (id) => {
    const token = localStorage.getItem('token')
    const a = document.createElement('a')
    a.href = `${API}/reports/student/${id}?token=${token}`
    a.download = `student_${id}_report.xlsx`
    a.click()
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedStudent) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      setStudentPhotos((prev) => ({ ...prev, [selectedStudent.id]: dataUrl }))
      setSuccess('Student photo updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const openEditModal = (student) => {
    if (!student) return
    setEditForm({
      id: student.id,
      register_number: student.register_number || '',
      full_name: student.full_name || '',
      department: student.department || 'AI & DS',
      section: student.section || 'Section A',
      email: student.email || '',
      phone: student.phone || ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editForm.id) {
        await axios.put(`${API}/students/${editForm.id}`, {
          full_name: editForm.full_name,
          department: editForm.department,
          section: editForm.section,
          email: editForm.email
        }).catch(() => null)
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === editForm.id ? { ...s, ...editForm } : s))
      )
      setSelectedStudent((prev) => (prev && prev.id === editForm.id ? { ...prev, ...editForm } : prev))
      setShowEditModal(false)
      setSuccess('Student details updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to update student details.')
    }
  }

  const openNoticeModal = (student) => {
    if (!student) return
    setNoticeForm({
      title: `Notice for ${student.full_name} (${student.register_number})`,
      content: `Dear ${student.full_name},\n\nPlease be advised regarding your upcoming academic sessions and attendance requirements.`,
      priority: 0,
      valid_duration: 60
    })
    setShowNoticeModal(true)
  }

  const handleSendNoticeSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/notices`, {
        title: noticeForm.title,
        content: noticeForm.content,
        priority: Number(noticeForm.priority),
        valid_duration: Number(noticeForm.valid_duration)
      }).catch(() => null)
      setShowNoticeModal(false)
      setSuccess(`Notice dispatched for ${selectedStudent?.full_name || 'student'}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to dispatch notice.')
    }
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setDeptFilter('All Departments')
    setStatusFilter('All Enrollment Status')
    setSectionFilter('All Sections')
  }

  // Filtered Students List
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.register_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDept =
      deptFilter === 'All Departments' ||
      s.department.toLowerCase().includes(deptFilter.toLowerCase())

    const matchesStatus =
      statusFilter === 'All Enrollment Status' ||
      (statusFilter === 'Enrolled' && s.enrollment_count >= MIN_SAMPLES) ||
      (statusFilter === 'Not Enrolled' && s.enrollment_count < MIN_SAMPLES)

    const matchesSection =
      sectionFilter === 'All Sections' ||
      s.section.toLowerCase() === sectionFilter.toLowerCase() ||
      s.section.toLowerCase() === sectionFilter.replace('Section ', '').toLowerCase()

    return matchesSearch && matchesDept && matchesStatus && matchesSection
  })

  // Calculations for metric summary cards
  const totalCount = students.length
  const enrolledCount = students.filter((s) => s.enrollment_count >= MIN_SAMPLES).length
  const notEnrolledCount = totalCount - enrolledCount
  const enrolledPct = totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0

  if (loading)
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    )

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Header Card with Campus Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#091b36] via-[#0d2850] to-[#174179] text-white p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img
            src="/vit-campus-building.png"
            alt="Velammal Campus"
            className="w-full h-full object-cover object-right"
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-2">
              <span>🏠</span>
              <span>&gt;</span>
              <span>Students</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Students</h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium mt-1">
              Manage student information, face enrollment and view academic details.
            </p>
          </div>

          <p className="text-xs font-serif italic text-blue-200 tracking-wider">
            "Students Today, Innovators Tomorrow"
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. Top 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Students</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">↑ +6 this month</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Face Enrolled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Face Enrolled</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{enrolledCount}</p>
            <p className="text-[11px] font-bold text-emerald-600 mt-1">{enrolledPct}% enrolled</p>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="18" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="#10b981"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * enrolledPct) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-emerald-600">{enrolledPct}%</span>
          </div>
        </div>

        {/* Card 3: Not Enrolled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Not Enrolled</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{notEnrolledCount}</p>
            <p className="text-[11px] font-semibold text-amber-600 mt-1">Need enrollment</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Departments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Departments</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">1</p>
            <p className="text-[11px] font-bold text-purple-600 mt-1">AI & DS</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, register number or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-400"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white"
          >
            <option>All Departments</option>
            <option>AI & DS</option>
          </select>

          {/* Enrollment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:bg-white"
          >
            <option>All Enrollment Status</option>
            <option>Enrolled</option>
            <option>Not Enrolled</option>
          </select>

          {/* SECTION FILTER DROPDOWN (Highlighted in Reference Image) */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 bg-blue-50 border-2 border-blue-400 rounded-xl text-xs font-bold text-blue-700 focus:outline-none focus:bg-white"
          >
            <option>All Sections</option>
            <option>Section A</option>
            <option>Section B</option>
            <option>Section C</option>
            <option>Section D</option>
            <option>Section E</option>
            <option>Section F</option>
          </select>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Primary Action Button: + Add Student */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>

      {/* 4. Main Grid — Data Table + Right Student Details Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Data Table (8 Cols when panel open, 12 Cols when closed) */}
        <div className={selectedStudent ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Students ({filteredStudents.length})
              </h3>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Show</span>
                <select className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>per page</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                  <tr>
                    <th className="p-3 w-8">
                      <input type="checkbox" className="rounded accent-blue-600" />
                    </th>
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 font-bold">Register No</th>
                    <th className="p-3 font-bold">Student Name</th>
                    <th className="p-3 font-bold">Dept / Section</th>
                    <th className="p-3 font-bold text-center">Enrollment</th>
                    <th className="p-3 font-bold text-center">Status</th>
                    <th className="p-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.map((s, idx) => {
                    const isSelected = selectedStudent?.id === s.id
                    const isEnrolled = s.enrollment_count >= MIN_SAMPLES

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded accent-blue-600" />
                        </td>
                        <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {s.register_number}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{s.full_name}</td>
                        <td className="p-3 text-slate-500 font-semibold">
                          {s.department} / {s.section.replace('Section ', '')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                            {s.enrollment_count}/{MIN_SAMPLES}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              isEnrolled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isEnrolled ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                            {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                          </span>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setTargetStudent(s)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Enroll</span>
                            </button>
                            <button
                              onClick={() => downloadReport(s.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>Report</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No students match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
              <p>Showing 1 to {filteredStudents.length} of {totalCount} students</p>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  2
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  3
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  4
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  5
                </button>
                <span>...</span>
                <button className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  25
                </button>
                <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: "Student Details" Side Panel (5 Cols) */}
        {selectedStudent && (
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 space-y-5 animate-in fade-in slide-in-from-right-2">
            {/* Side Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Student Details</h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Header Summary */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-black text-xl flex items-center justify-center shrink-0 shadow-xs border border-blue-200">
                {selectedStudent.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-slate-900 text-base truncate">
                    {selectedStudent.full_name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    + Active
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-slate-500">
                  {selectedStudent.register_number}
                </p>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  {selectedStudent.department} - {selectedStudent.section} &nbsp;|&nbsp; ✉ {selectedStudent.email} &nbsp;|&nbsp; 📞 {selectedStudent.phone}
                </p>
              </div>
            </div>

            {/* Side Panel Tabs */}
            <div className="flex items-center border-b border-slate-100 text-xs font-bold">
              {['Overview', 'Face Enrollment', 'Attendance', 'Academic'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-3 border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Details Grid (Left) & Quick Actions / Photo (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Left Column: Full Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Register Number</p>
                  <p className="font-mono font-bold text-slate-800">
                    {selectedStudent.register_number}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Full Name</p>
                  <p className="font-bold text-slate-900">{selectedStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Department</p>
                  <p className="font-bold text-slate-800">
                    Artificial Intelligence & Data Science
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Section</p>
                  <p className="font-bold text-blue-600">{selectedStudent.section}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Email</p>
                  <p className="font-semibold text-slate-700">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Phone</p>
                  <p className="font-semibold text-slate-700">{selectedStudent.phone}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400">Enrollment Status</p>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Not Enrolled
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                    <span>Face Samples</span>
                    <span>{selectedStudent.enrollment_count} / 5</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${(selectedStudent.enrollment_count / 5) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Photo & Quick Actions */}
              <div className="space-y-4">
                {/* Photo Block */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-700 mb-2">Student Photo</p>
                  <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mb-2">
                    <User className="w-10 h-10" />
                  </div>
                  <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>

                {/* Quick Actions List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-800">Quick Actions</p>
                  <button
                    onClick={() => setTargetStudent(selectedStudent)}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Enroll Face</span>
                  </button>
                  <button className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>View Attendance</span>
                  </button>
                  <button className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Academic Details</span>
                  </button>
                  <button className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Notice</span>
                  </button>
                  <button className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Student</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add Student Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Add New Student</h3>
                  <p className="text-xs text-slate-500">
                    Register student details and assign section
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Register Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22AIDS1A011"
                  value={form.register_number}
                  onChange={(e) => setForm({ ...form, register_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white"
                  >
                    <option>AI & DS</option>
                  </select>
                </div>

                {/* SECTION SELECT INPUT */}
                <div>
                  <label className="block text-slate-700 mb-1">Section *</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-blue-50 border-2 border-blue-400 rounded-xl font-bold text-blue-700 focus:outline-none focus:bg-white"
                  >
                    <option>Section A</option>
                    <option>Section B</option>
                    <option>Section C</option>
                    <option>Section D</option>
                    <option>Section E</option>
                    <option>Section F</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="student@vit.ac.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Face Enrollment Modal (face-api.js) */}
      {targetStudent && (
        <EnrollmentBoundary
          onClose={() => {
            setTargetStudent(null)
            load()
          }}
        >
          <EnrollmentModal
            student={targetStudent}
            onClose={() => {
              setTargetStudent(null)
              load()
            }}
          />
        </EnrollmentBoundary>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENT MODAL — face-api.js browser-side detection
// ═══════════════════════════════════════════════════════════════════════════
const MIN_FACE_PX = 80
let modelsLoaded = false

async function loadModels() {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH)
  ])
  modelsLoaded = true
}

function EnrollmentModal({ student, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const captureRef = useRef(null)
  const rafRef = useRef(null)
  const doCaptureRef = useRef(null)

  const greenSince = useRef(0)
  const lastCapture = useRef(0)
  const isSaving = useRef(false)
  const captureCount = useRef(student.enrollment_count || 0)
  const mounted = useRef(true)
  const lastDetection = useRef(null)

  const [ui, setUi] = useState({
    modelsReady: false,
    cameraReady: false,
    cameraError: '',
    count: student.enrollment_count || 0,
    samples: [],
    statusColor: 'gray',
    statusMsg: 'Loading face models…',
    saving: false
  })

  const setStatus = (color, msg) =>
    setUi((prev) => ({ ...prev, statusColor: color, statusMsg: msg }))

  useEffect(() => {
    mounted.current = true

    const init = async () => {
      try {
        setStatus('gray', 'Loading face detection models…')
        await loadModels()
        setUi((prev) => ({ ...prev, modelsReady: true, statusMsg: 'Starting camera…' }))
        await startCamera()
      } catch (err) {
        setUi((prev) => ({ ...prev, cameraError: 'Failed to load models: ' + err.message }))
      }
    }

    init()

    return () => {
      mounted.current = false
      cancelAnimationFrame(rafRef.current)
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      if (mounted.current)
        setUi((prev) => ({ ...prev, cameraError: `Camera unavailable: ${err.message}` }))
    }
  }

  const stopCamera = () => {
    const v = videoRef.current
    if (v?.srcObject) {
      v.srcObject.getTracks().forEach((t) => t.stop())
      v.srcObject = null
    }
  }

  const onVideoReady = () => {
    setUi((prev) => ({ ...prev, cameraReady: true, statusMsg: 'Position your face in the oval' }))
    startDetectionLoop()
  }

  const startDetectionLoop = () => {
    const detect = async () => {
      if (!mounted.current) return

      const video = videoRef.current
      if (video && video.readyState === 4) {
        try {
          const det = await faceapi
            .detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
            )
            .withFaceLandmarks()

          if (!mounted.current) return

          lastDetection.current = det || null
          drawOverlay(det)
          updateStatus(det)

          if (det) {
            const box = det.detection.box
            const score = det.detection.score
            const isGoodSize = box.width >= MIN_FACE_PX && box.height >= MIN_FACE_PX
            const isGoodScore = score >= 0.55

            if (isGoodSize && isGoodScore) {
              if (!greenSince.current) greenSince.current = Date.now()
              const held = Date.now() - greenSince.current
              const coolOk = Date.now() - lastCapture.current >= COOLDOWN_MS
              const notDone = captureCount.current < MAX_SAMPLES

              if (held >= GREEN_HOLD_MS && coolOk && !isSaving.current && notDone) {
                doCaptureRef.current && doCaptureRef.current()
              }
            } else {
              greenSince.current = 0
            }
          } else {
            greenSince.current = 0
          }
        } catch {}
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)
  }

  const updateStatus = (det) => {
    if (!det) {
      setStatus('gray', '👤  No face detected — look directly at the camera')
      return
    }

    const box = det.detection.box
    const score = det.detection.score
    const small = box.width < MIN_FACE_PX || box.height < MIN_FACE_PX
    const lowConf = score < 0.55

    if (small) {
      setStatus('yellow', '🟡  Move closer to the camera')
    } else if (lowConf) {
      setStatus('yellow', '🟡  Improve lighting — face the camera directly')
    } else {
      const held = greenSince.current ? Date.now() - greenSince.current : 0
      const pct = Math.min(100, Math.round((held / GREEN_HOLD_MS) * 100))
      setStatus(
        'green',
        pct >= 100 ? '🟢  Capturing…' : `🟢  Perfect! Hold still… ${pct}%`
      )
    }
  }

  const drawOverlay = (det) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const dw = video.offsetWidth
    const dh = video.offsetHeight
    if (!dw || !dh) return

    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw
      canvas.height = dh
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, dw, dh)

    const cx = dw / 2
    const cy = dh / 2
    const rx = dw * 0.28
    const ry = dh * 0.42

    if (!det) {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 6])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('👤  Look at the camera', cx, cy + ry + 24)
      return
    }

    const box = det.detection.box
    const score = det.detection.score
    const scaleX = dw / (video.videoWidth || dw)
    const scaleY = dh / (video.videoHeight || dh)

    const mirroredX = (video.videoWidth || dw) - box.x - box.width
    const bx = mirroredX * scaleX
    const by = box.y * scaleY
    const bw = box.width * scaleX
    const bh = box.height * scaleY

    const small = box.width < MIN_FACE_PX || box.height < MIN_FACE_PX
    const lowConf = score < 0.55
    const isGood = !small && !lowConf

    const colour = isGood ? '#22c55e' : small || lowConf ? '#eab308' : '#ef4444'
    const lineW = isGood ? 4 : 3

    ctx.shadowColor = colour
    ctx.shadowBlur = 22

    ctx.strokeStyle = colour
    ctx.lineWidth = lineW
    ctx.strokeRect(bx, by, bw, bh)
    ctx.shadowBlur = 0

    const L = 14,
      BW = lineW + 1
    const corners = [
      [bx, by, 1, 1],
      [bx + bw, by, -1, 1],
      [bx, by + bh, 1, -1],
      [bx + bw, by + bh, -1, -1]
    ]
    ctx.strokeStyle = colour
    ctx.lineWidth = BW
    corners.forEach(([tx, ty, sx, sy]) => {
      ctx.beginPath()
      ctx.moveTo(tx + sx * L, ty)
      ctx.lineTo(tx, ty)
      ctx.lineTo(tx, ty + sy * L)
      ctx.stroke()
    })

    if (isGood && greenSince.current) {
      const pct = Math.min(1, (Date.now() - greenSince.current) / GREEN_HOLD_MS)
      const bcx = bx + bw / 2
      const bcy = by + bh / 2
      const brad = Math.min(bw, bh) / 2 + 10
      ctx.beginPath()
      ctx.arc(bcx, bcy, brad, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2)
      ctx.strokeStyle = '#86efac'
      ctx.lineWidth = 5
      ctx.stroke()
    }

    const pctScore = Math.round(score * 100)
    ctx.fillStyle = colour + 'cc'
    ctx.fillRect(bx, by - 22, 46, 18)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`${pctScore}%`, bx + 4, by - 8)

    if (det.landmarks) {
      ctx.fillStyle = colour + '99'
      det.landmarks.positions.forEach((pt) => {
        const px = (video.videoWidth - pt.x) * scaleX
        const py = pt.y * scaleY
        ctx.beginPath()
        ctx.arc(px, py, 1.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }

  const grabBase64 = () => {
    const video = videoRef.current
    const canvas = captureRef.current
    if (!video || !canvas) return null
    const w = video.videoWidth,
      h = video.videoHeight
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    ctx.restore()
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  }

  const doCapture = async () => {
    if (isSaving.current) return
    isSaving.current = true
    greenSince.current = 0
    lastCapture.current = Date.now()

    const base64 = grabBase64()
    if (!base64) {
      isSaving.current = false
      return
    }

    const idx = captureCount.current
    setUi((prev) => ({
      ...prev,
      saving: true,
      statusMsg: `📸 Saving sample ${idx + 1}…`,
      statusColor: 'green'
    }))

    try {
      const fd = new FormData()
      fd.append('student_id', student.id)
      fd.append('image_data', base64)
      fd.append('capture_index', idx)

      const res = await axios.post(`${API}/enrollment/capture`, fd)
      const data = res.data

      if (data.success) {
        const newCount = idx + 1
        captureCount.current = newCount
        setUi((prev) => ({
          ...prev,
          saving: false,
          count: newCount,
          samples: [...prev.samples, { index: idx, quality: data.quality?.label || 'GOOD' }],
          statusMsg: `✅ Sample ${newCount} saved!${
            newCount < MIN_SAMPLES
              ? ` (${MIN_SAMPLES - newCount} more needed)`
              : ' 🎉 Minimum reached!'
          }`,
          statusColor: 'green'
        }))
      } else {
        setStatus('red', `❌ ${data.reason || 'Capture failed — try again'}`)
        setUi((prev) => ({ ...prev, saving: false }))
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail[0]?.msg || 'Validation error'
        : typeof detail === 'string'
        ? detail
        : err.message || 'Server error'
      setStatus('red', `❌ ${msg}`)
      setUi((prev) => ({ ...prev, saving: false }))
    }

    setTimeout(() => {
      if (mounted.current) {
        isSaving.current = false
        if (captureCount.current < MAX_SAMPLES)
          setStatus('gray', 'Position your face in the oval')
      }
    }, 1200)
  }

  doCaptureRef.current = doCapture

  const manualCapture = () => {
    if (!isSaving.current) doCapture()
  }

  const isDone = ui.count >= MAX_SAMPLES
  const isReady = ui.count >= MIN_SAMPLES

  const statusBg = {
    green: 'bg-green-900/90 text-green-100',
    yellow: 'bg-yellow-900/90 text-yellow-100',
    red: 'bg-red-900/90 text-red-100',
    gray: 'bg-black/65 text-white/80'
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900">{student.full_name}</h3>
            <p className="text-xs text-gray-500">{student.register_number} · Face Enrollment</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onCanPlay={onVideoReady}
            style={{ transform: 'scaleX(-1)' }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />

          <canvas ref={captureRef} className="hidden" />

          {(!ui.modelsReady || !ui.cameraReady) && !ui.cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 gap-3 z-20">
              <div className="animate-spin h-10 w-10 border-b-2 border-white rounded-full" />
              <p className="text-sm">{ui.statusMsg}</p>
            </div>
          )}

          {ui.cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-6 text-center z-20">
              <p className="text-4xl">📷</p>
              <p className="text-sm">{ui.cameraError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          )}

          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full z-20">
            {ui.count} / {MAX_SAMPLES}
          </div>

          {ui.cameraReady && !isDone && (
            <div className="absolute top-2 right-2 bg-blue-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              AUTO
            </div>
          )}

          {ui.cameraReady && (
            <div
              className={`absolute bottom-0 left-0 right-0 py-2 px-4 text-sm font-medium text-center z-20 transition-colors ${
                statusBg[ui.statusColor] || statusBg.gray
              }`}
            >
              {ui.statusMsg}
            </div>
          )}
        </div>

        <div className="px-5 py-3 space-y-2 border-b">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span className={isReady ? 'text-green-600 font-medium' : ''}>
              {ui.count}/{MAX_SAMPLES}
              {isReady && !isDone && ' ✓ minimum reached'}
              {isDone && ' ✓ complete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isDone ? 'bg-green-500' : isReady ? 'bg-green-400' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, (ui.count / MAX_SAMPLES) * 100)}%` }}
            />
          </div>
          {ui.samples.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ui.samples.map((c, i) => (
                <div
                  key={i}
                  title={c.quality}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    c.quality === 'GOOD'
                      ? 'bg-green-100 text-green-700'
                      : c.quality === 'ACCEPTABLE'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {c.index + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 flex gap-3">
          {!isDone ? (
            <button
              onClick={manualCapture}
              disabled={ui.saving || !ui.cameraReady || !!ui.cameraError}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ui.saving ? '⏳ Saving…' : '📸 Capture Manually'}
            </button>
          ) : (
            <div className="flex-1 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
              ✓ Enrollment Complete!
            </div>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            {isReady ? 'Done ✓' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
