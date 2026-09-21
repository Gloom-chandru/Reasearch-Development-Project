import React, { useState } from 'react'
import {
  CalendarDays,
  Clock,
  BookOpen,
  Users,
  Award,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  Coffee,
  Utensils,
  GraduationCap,
  Layers,
  Filter,
  CheckCircle2
} from 'lucide-react'

// Course Master Directory from the official schedule
export const COURSES = [
  { code: 'OME354', title: 'Applied Design Thinking', acronym: 'ADT', category: 'Open Elective', faculty: 'Dr. S. Padmapriya', credits: 3, periods: 6, color: 'border-blue-500 bg-blue-50/70 text-blue-800' },
  { code: 'GE3751', title: 'Principles Of Management', acronym: 'POM', category: 'HSMC', faculty: 'Mr. Kalaiselvan', credits: 3, periods: 6, color: 'border-purple-500 bg-purple-50/70 text-purple-800' },
  { code: 'AI3021', title: 'IT in Agricultural System', acronym: 'ITAS', category: 'Professional Core', faculty: 'Mr. M. Sivakarthikeyan', credits: 3, periods: 6, color: 'border-emerald-500 bg-emerald-50/70 text-emerald-800' },
  { code: 'GE3791', title: 'Human Values and Ethics', acronym: 'HVE', category: 'HSMC', faculty: 'Ms. R. Hemalatha', credits: 2, periods: 6, color: 'border-amber-500 bg-amber-50/70 text-amber-800' },
  { code: 'SR', title: 'SKILL RACK', acronym: 'SR', category: 'Skill Enhancement', faculty: 'Mrs. K. Vidhya, Mrs. G. Sujitha, Mrs. K. Sudha', credits: 1, periods: 5, color: 'border-indigo-500 bg-indigo-50/70 text-indigo-800' },
  { code: 'PL', title: 'PLACEMENT', acronym: 'PL', category: 'Career Readiness', faculty: 'Mrs. K. Sudha, Mr. M. Sivakarthikeyan, Mrs. V. Devi, Mrs. Nishanthini, Mrs. E. Sheela', credits: 1, periods: 5, color: 'border-rose-500 bg-rose-50/70 text-rose-800' },
  { code: 'SEMINAR', title: 'SEMINAR', acronym: 'SEM', category: 'Academic', faculty: 'Mrs. K. Vidhya', credits: 1, periods: 1, color: 'border-teal-500 bg-teal-50/70 text-teal-800' },
  { code: 'PROJECT', title: 'PROJECT', acronym: 'PROJ', category: 'Capstone', faculty: 'Mrs. K. Vidhya', credits: 2, periods: 2, color: 'border-cyan-500 bg-cyan-50/70 text-cyan-800' },
  { code: 'ACT', title: 'ACTIVITY', acronym: 'ACT', category: 'Co-Curricular', faculty: 'DEPT STAFF (Kenita, Sharmila)', credits: 0, periods: 2, color: 'border-orange-500 bg-orange-50/70 text-orange-800' },
  { code: 'LIB', title: 'LIB / Counselling', acronym: 'LIB', category: 'Support', faculty: 'Mrs. K. Vidhya', credits: 0, periods: 1, color: 'border-slate-500 bg-slate-50/70 text-slate-800' },
  { code: 'PSS/PAT', title: 'Placement Soft Skill / Aptitude', acronym: 'PSS/PAT', category: 'Training', faculty: 'Mr. N. Venkatesh / Ms. S. Krithiga', credits: 1, periods: 2, color: 'border-lime-500 bg-lime-50/70 text-lime-800' }
]

export const PERIOD_SLOTS = [
  { id: 1, label: 'Period 1', time: '8:30 – 9:20 AM' },
  { id: 2, label: 'Period 2', time: '9:20 – 10:10 AM' },
  { id: 'tea', label: 'Tea Break', time: '10:10 – 10:25 AM', isBreak: true },
  { id: 3, label: 'Period 3', time: '10:25 – 11:15 AM' },
  { id: 4, label: 'Period 4', time: '11:15 – 12:00 PM' },
  { id: 'lunch', label: 'Lunch Break', time: '12:00 – 12:45 PM', isBreak: true },
  { id: 5, label: 'Period 5', time: '12:45 – 1:35 PM' },
  { id: 6, label: 'Period 6', time: '1:35 – 2:25 PM' },
  { id: 7, label: 'Period 7', time: '2:25 – 3:15 PM' }
]

// SECTION A: Exactly from the official college timetable image
export const TIMETABLE_SECTION_A = {
  Monday: [
    { code: 'AI3021', name: 'ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'SR', name: 'SR (VIDHYA)', faculty: 'Mrs. K. Vidhya' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'SR', name: 'SR (SUJI)', faculty: 'Mrs. G. Sujitha' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'PL', name: 'PL (DEVI)', faculty: 'Mrs. V. Devi' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' }
  ],
  Tuesday: [
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'PROJECT', name: 'PROJECT', faculty: 'Mrs. K. Vidhya' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'SEMINAR', name: 'SEMINAR', faculty: 'Mrs. K. Vidhya' }
  ],
  Wednesday: [
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'SR', name: 'SR (SUDHA)', faculty: 'Mrs. K. Sudha' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'PL', name: 'PL (KENITA)', faculty: 'Mrs. Kenita' }
  ],
  Thursday: [
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'LIB', name: 'LIB', faculty: 'Mrs. K. Vidhya' },
    { code: 'PL', name: 'PL (JEMIMA)', faculty: 'Mrs. Jemima' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'PL', name: 'PL (SHEELA)', faculty: 'Mrs. E. Sheela' }
  ],
  Friday: [
    { code: 'PSS', name: 'PSS', faculty: 'Mr. N. Venkatesh' },
    { code: 'SR', name: 'SR (SUDHA)', faculty: 'Mrs. K. Sudha' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'PROJECT', name: 'PROJECT', faculty: 'Mrs. K. Vidhya' },
    { code: 'ACT', name: 'ACT (KENITA)', faculty: 'Mrs. Kenita' },
    { code: 'ACT', name: 'ACT (SHARMILA)', faculty: 'Mrs. Sharmila' }
  ],
  Saturday: [
    { code: 'PAT', name: 'PAT', faculty: 'Ms. S. Krithiga' },
    { code: 'PL', name: 'PL (SHEELA)', faculty: 'Mrs. E. Sheela' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'SR', name: 'SR (SUJI)', faculty: 'Mrs. G. Sujitha' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' }
  ]
}

// SECTION B: Harmoniously shuffled schedule of the exact same courses
export const TIMETABLE_SECTION_B = {
  Monday: [
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'SR', name: 'SR (SUJI)', faculty: 'Mrs. G. Sujitha' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'PL', name: 'PL (DEVI)', faculty: 'Mrs. V. Devi' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'SR', name: 'SR (VIDHYA)', faculty: 'Mrs. K. Vidhya' }
  ],
  Tuesday: [
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'PROJECT', name: 'PROJECT', faculty: 'Mrs. K. Vidhya' },
    { code: 'SEMINAR', name: 'SEMINAR', faculty: 'Mrs. K. Vidhya' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' }
  ],
  Wednesday: [
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'SR', name: 'SR (SUDHA)', faculty: 'Mrs. K. Sudha' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'PL', name: 'PL (KENITA)', faculty: 'Mrs. Kenita' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' }
  ],
  Thursday: [
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'LIB', name: 'LIB', faculty: 'Mrs. K. Vidhya' },
    { code: 'OME354', name: 'OME354-ADT', faculty: 'Dr. S. Padmapriya' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'PL', name: 'PL (SHEELA)', faculty: 'Mrs. E. Sheela' },
    { code: 'PL', name: 'PL (JEMIMA)', faculty: 'Mrs. Jemima' }
  ],
  Friday: [
    { code: 'SR', name: 'SR (SUDHA)', faculty: 'Mrs. K. Sudha' },
    { code: 'PSS', name: 'PSS', faculty: 'Mr. N. Venkatesh' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'ACT', name: 'ACT (KENITA)', faculty: 'Mrs. Kenita' },
    { code: 'PROJECT', name: 'PROJECT', faculty: 'Mrs. K. Vidhya' },
    { code: 'ACT', name: 'ACT (SHARMILA)', faculty: 'Mrs. Sharmila' }
  ],
  Saturday: [
    { code: 'PL', name: 'PL (SHEELA)', faculty: 'Mrs. E. Sheela' },
    { code: 'PAT', name: 'PAT', faculty: 'Ms. S. Krithiga' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'GE3751', name: 'GE3751-POM', faculty: 'Mr. Kalaiselvan' },
    { code: 'AI3021', name: 'AI3021-ITAS', faculty: 'Mr. M. Sivakarthikeyan' },
    { code: 'GE3791', name: 'GE3791-HVE', faculty: 'Ms. R. Hemalatha' },
    { code: 'SR', name: 'SR (SUJI)', faculty: 'Mrs. G. Sujitha' }
  ]
}

const getCourseStyle = (code) => {
  const found = COURSES.find(c => c.code === code || code.includes(c.code))
  return found?.color || 'border-slate-300 bg-slate-50 text-slate-700'
}

export default function TimetablePage() {
  const [selectedSection, setSelectedSection] = useState('A')
  const [selectedDay, setSelectedDay] = useState('All') // 'All' | 'Monday' | ...

  const currentSchedule = selectedSection === 'A' ? TIMETABLE_SECTION_A : TIMETABLE_SECTION_B
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 tracking-wider">
              REVISE-1
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              Year: IV &nbsp;|&nbsp; Semester: VII
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
              Branch: AI & DS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            <span>Classroom Timetable & Schedule</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Department of Artificial Intelligence & Data Science — Velammal Institute of Technology
          </p>
        </div>

        {/* Section Switcher & Print Control */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold shadow-inner">
            <button
              onClick={() => setSelectedSection('A')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedSection === 'A'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI & DS - Section "A"
            </button>
            <button
              onClick={() => setSelectedSection('B')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                selectedSection === 'B'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI & DS - Section "B" (Shuffled)
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Day Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Filter Day:
        </span>
        {['All', ...days].map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
              selectedDay === d
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Main Timetable Visual Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th className="p-3 font-extrabold border-r border-slate-800 w-28">Day \ Period</th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">1</span>
                  <span className="text-[10px] text-slate-300 font-medium">8:30 - 9:20</span>
                </th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">2</span>
                  <span className="text-[10px] text-slate-300 font-medium">9:20 - 10:10</span>
                </th>
                {/* Tea break header */}
                <th className="p-1 bg-amber-950/40 text-amber-200 border-r border-slate-800 w-12 text-[10px] font-semibold">
                  <Coffee className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  Tea
                </th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">3</span>
                  <span className="text-[10px] text-slate-300 font-medium">10:25 - 11:15</span>
                </th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">4</span>
                  <span className="text-[10px] text-slate-300 font-medium">11:15 - 12:00</span>
                </th>
                {/* Lunch break header */}
                <th className="p-1 bg-emerald-950/40 text-emerald-200 border-r border-slate-800 w-12 text-[10px] font-semibold">
                  <Utensils className="w-3.5 h-3.5 mx-auto mb-0.5" />
                  Lunch
                </th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">5</span>
                  <span className="text-[10px] text-slate-300 font-medium">12:45 - 1:35</span>
                </th>
                <th className="p-2.5 border-r border-slate-800">
                  <span className="block font-bold">6</span>
                  <span className="text-[10px] text-slate-300 font-medium">1:35 - 2:25</span>
                </th>
                <th className="p-2.5">
                  <span className="block font-bold">7</span>
                  <span className="text-[10px] text-slate-300 font-medium">2:25 - 3:15</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {days
                .filter(dayName => selectedDay === 'All' || selectedDay === dayName)
                .map((dayName) => {
                  const periods = currentSchedule[dayName] || []
                  return (
                    <tr key={dayName} className="hover:bg-slate-50/70 transition-colors">
                      {/* Day Label */}
                      <td className="p-3 font-extrabold text-slate-800 bg-slate-50/80 border-r border-slate-200 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span>{dayName}</span>
                        </div>
                      </td>

                      {/* Period 1 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[0]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[0]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[0]?.faculty}>{periods[0]?.faculty}</p>
                        </div>
                      </td>

                      {/* Period 2 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[1]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[1]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[1]?.faculty}>{periods[1]?.faculty}</p>
                        </div>
                      </td>

                      {/* Tea Break */}
                      <td className="p-1 bg-amber-50/50 border-r border-slate-100 text-[10px] text-amber-800 font-semibold writing-vertical text-center select-none">
                        10:10 - 10:25
                      </td>

                      {/* Period 3 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[2]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[2]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[2]?.faculty}>{periods[2]?.faculty}</p>
                        </div>
                      </td>

                      {/* Period 4 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[3]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[3]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[3]?.faculty}>{periods[3]?.faculty}</p>
                        </div>
                      </td>

                      {/* Lunch Break */}
                      <td className="p-1 bg-emerald-50/50 border-r border-slate-100 text-[10px] text-emerald-800 font-semibold writing-vertical text-center select-none">
                        12:00 - 12:45
                      </td>

                      {/* Period 5 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[4]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[4]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[4]?.faculty}>{periods[4]?.faculty}</p>
                        </div>
                      </td>

                      {/* Period 6 */}
                      <td className="p-2 border-r border-slate-100 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[5]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[5]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[5]?.faculty}>{periods[5]?.faculty}</p>
                        </div>
                      </td>

                      {/* Period 7 */}
                      <td className="p-2 align-middle">
                        <div className={`p-2 rounded-xl border text-left shadow-xs transition-transform hover:scale-102 ${getCourseStyle(periods[6]?.code)}`}>
                          <p className="font-extrabold leading-tight text-[11px]">{periods[6]?.name}</p>
                          <p className="text-[9px] opacity-80 truncate" title={periods[6]?.faculty}>{periods[6]?.faculty}</p>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Notice note from image */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between font-medium">
          <p className="italic">
            *There won't be any classes on Monday if that day falls on the Naan Mudhalavan Course schedule.
          </p>
          <span className="font-bold text-slate-800">Total: 42 Periods / Week</span>
        </div>
      </div>

      {/* Course & Faculty Directory Table */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Course & Faculty Directory</h3>
            <p className="text-xs text-slate-500">Official subject allocations and faculty mentors for AI & DS</p>
          </div>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {COURSES.length} Allocated Subjects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                <th className="p-2.5">Sl. No.</th>
                <th className="p-2.5">Course Code</th>
                <th className="p-2.5">Course Title</th>
                <th className="p-2.5">Category / Acronym</th>
                <th className="p-2.5">Faculty Name</th>
                <th className="p-2.5 text-center">Credits</th>
                <th className="p-2.5 text-center">Periods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COURSES.map((c, idx) => (
                <tr key={c.code} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-2.5 font-bold text-slate-400">{idx + 1}.</td>
                  <td className="p-2.5 font-mono font-extrabold text-blue-600">{c.code}</td>
                  <td className="p-2.5 font-bold text-slate-900">{c.title}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {c.acronym}
                    </span>
                  </td>
                  <td className="p-2.5 font-medium text-slate-700">{c.faculty}</td>
                  <td className="p-2.5 text-center font-bold text-slate-900">{c.credits}</td>
                  <td className="p-2.5 text-center font-extrabold text-blue-700">{c.periods}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-extrabold text-slate-800 border-t border-slate-200 text-xs">
                <td colSpan={6} className="p-3 text-right">Total Scheduled Periods:</td>
                <td className="p-3 text-center text-blue-700 font-black">42</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
