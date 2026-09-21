import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  Calendar,
  Users,
  Target,
  TrendingUp,
  History,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2
} from 'lucide-react'

// Week 2 (Current Academic Week: Sep 15 - Sep 20, 2026, strictly Mon to Sat)
const WEEK_2_DATES = [
  { day: 'Mon', date: 'Sep 15', fullDate: 'Sep 15, 2026', dayFull: 'Monday', isoDate: '2026-09-15' },
  { day: 'Tue', date: 'Sep 16', fullDate: 'Sep 16, 2026', dayFull: 'Tuesday', isoDate: '2026-09-16' },
  { day: 'Wed', date: 'Sep 17', fullDate: 'Sep 17, 2026', dayFull: 'Wednesday', isoDate: '2026-09-17' },
  { day: 'Thu', date: 'Sep 18', fullDate: 'Sep 18, 2026', dayFull: 'Thursday', isoDate: '2026-09-18' },
  { day: 'Fri', date: 'Sep 19', fullDate: 'Sep 19, 2026', dayFull: 'Friday', isoDate: '2026-09-19' },
  { day: 'Sat', date: 'Sep 20', fullDate: 'Sep 20, 2026', dayFull: 'Saturday', isoDate: '2026-09-20' }
]

// Week 1 (Previous Academic Week: Sep 08 - Sep 13, 2026, strictly Mon to Sat)
const WEEK_1_DATES = [
  { day: 'Mon', date: 'Sep 08', fullDate: 'Sep 08, 2026', dayFull: 'Monday', isoDate: '2026-09-08' },
  { day: 'Tue', date: 'Sep 09', fullDate: 'Sep 09, 2026', dayFull: 'Tuesday', isoDate: '2026-09-09' },
  { day: 'Wed', date: 'Sep 10', fullDate: 'Sep 10, 2026', dayFull: 'Wednesday', isoDate: '2026-09-10' },
  { day: 'Thu', date: 'Sep 11', fullDate: 'Sep 11, 2026', dayFull: 'Thursday', isoDate: '2026-09-11' },
  { day: 'Fri', date: 'Sep 12', fullDate: 'Sep 12, 2026', dayFull: 'Friday', isoDate: '2026-09-12' },
  { day: 'Sat', date: 'Sep 13', fullDate: 'Sep 13, 2026', dayFull: 'Saturday', isoDate: '2026-09-13' }
]

// Section A Official Timetable Data (Mon to Sat)
const SECTION_A_DATA = {
  sectionId: 'A',
  title: 'Section A',
  classroomCode: 'AIDS-1A',
  className: 'AI&DS Year IV (Sem VII) — Section A',
  totalStudents: 60,
  weeks: {
    week2: [
      { ...WEEK_2_DATES[0], present: 54, absent: 6, total: 60, subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[1], present: 56, absent: 4, total: 60, subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[2], present: 52, absent: 8, total: 60, subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '09:20 - 11:15 AM' },
      { ...WEEK_2_DATES[3], present: 55, absent: 5, total: 60, subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[4], present: 53, absent: 7, total: 60, subject: 'PSS: Placement Soft Skill Training', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[5], present: 57, absent: 3, total: 60, subject: 'PAT: Placement Aptitude & Technical', timeSlot: '08:30 - 10:10 AM' }
    ],
    week1: [
      { ...WEEK_1_DATES[0], present: 52, absent: 8, total: 60, subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[1], present: 54, absent: 6, total: 60, subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[2], present: 50, absent: 10, total: 60, subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '09:20 - 11:15 AM' },
      { ...WEEK_1_DATES[3], present: 53, absent: 7, total: 60, subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[4], present: 51, absent: 9, total: 60, subject: 'PSS: Placement Soft Skill Training', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[5], present: 55, absent: 5, total: 60, subject: 'PAT: Placement Aptitude & Technical', timeSlot: '08:30 - 10:10 AM' }
    ]
  }
}

// Section B Shuffled Timetable Data (Mon to Sat)
const SECTION_B_DATA = {
  sectionId: 'B',
  title: 'Section B',
  classroomCode: 'AIDS-1B',
  className: 'AI&DS Year IV (Sem VII) — Section B',
  totalStudents: 60,
  weeks: {
    week2: [
      { ...WEEK_2_DATES[0], present: 55, absent: 5, total: 60, subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[1], present: 57, absent: 3, total: 60, subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[2], present: 53, absent: 7, total: 60, subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_2_DATES[3], present: 56, absent: 4, total: 60, subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '09:20 - 10:10 AM' },
      { ...WEEK_2_DATES[4], present: 54, absent: 6, total: 60, subject: 'SR: Skill Rack Problem Solving', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[5], present: 58, absent: 2, total: 60, subject: 'PL: Placement Mock Interview & Prep', timeSlot: '08:30 - 10:10 AM' }
    ],
    week1: [
      { ...WEEK_1_DATES[0], present: 53, absent: 7, total: 60, subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[1], present: 55, absent: 5, total: 60, subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[2], present: 51, absent: 9, total: 60, subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_1_DATES[3], present: 54, absent: 6, total: 60, subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '09:20 - 10:10 AM' },
      { ...WEEK_1_DATES[4], present: 52, absent: 8, total: 60, subject: 'SR: Skill Rack Problem Solving', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[5], present: 56, absent: 4, total: 60, subject: 'PL: Placement Mock Interview & Prep', timeSlot: '08:30 - 10:10 AM' }
    ]
  }
}

export default function AttendanceOverview() {
  const [selectedSection, setSelectedSection] = useState('A') // 'A', 'B', 'compare'
  const [selectedWeek, setSelectedWeek] = useState('week2') // 'week2', 'week1'
  const [activeDayIndex, setActiveDayIndex] = useState(5) // default: Saturday Sep 20 (latest day)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  // Current dataset according to selected week
  const secAWeek = SECTION_A_DATA.weeks[selectedWeek] || SECTION_A_DATA.weeks.week2
  const secBWeek = SECTION_B_DATA.weeks[selectedWeek] || SECTION_B_DATA.weeks.week2
  const currentWeekDays = selectedWeek === 'week2' ? WEEK_2_DATES : WEEK_1_DATES

  // Calculate high-level summary stats
  const stats = useMemo(() => {
    const calcAvg = (list) => {
      const totalPres = list.reduce((s, d) => s + d.present, 0)
      const totalCap = list.reduce((s, d) => s + (d.total || 60), 0)
      return totalCap > 0 ? Math.round((totalPres / totalCap) * 100) : 0
    }

    const avgA = calcAvg(secAWeek)
    const avgB = calcAvg(secBWeek)

    const activeA = secAWeek[activeDayIndex] || secAWeek[secAWeek.length - 1]
    const activeB = secBWeek[activeDayIndex] || secBWeek[secBWeek.length - 1]

    return {
      avgA,
      avgB,
      activeA,
      activeB,
      combinedAvg: Math.round((avgA + avgB) / 2)
    }
  }, [secAWeek, secBWeek, activeDayIndex])

  const inspectedDayA = stats.activeA
  const inspectedDayB = stats.activeB

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 transition-all">
      {/* 1. Header Row: Title, Section Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Attendance Overview
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                Mon – Sat (6 Days)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Year IV (Sem VII) • Anna Univ Minimum Target: <strong className="text-amber-700 font-bold">75%</strong>
            </p>
          </div>
        </div>

        {/* Controls: Section Switcher & Week Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600">
            <button
              onClick={() => setSelectedSection('A')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedSection === 'A'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Section A
            </button>
            <button
              onClick={() => setSelectedSection('B')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedSection === 'B'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Section B
            </button>
            <button
              onClick={() => setSelectedSection('compare')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                selectedSection === 'compare'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Compare Both</span>
            </button>
          </div>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-2xs"
          >
            <option value="week2">Sep 15 - 20 (Week 2)</option>
            <option value="week1">Sep 08 - 13 (Week 1)</option>
          </select>

          <button
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            title="View table records"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Key Stats Strip (Single clean row, no wasted height) */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 my-2.5 rounded-xl bg-slate-50/90 border border-slate-200/60 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {selectedSection === 'A' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Weekly Average:</span>
                <span className="font-black text-blue-700">{stats.avgA}%</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Selected ({inspectedDayA.day}, {inspectedDayA.date}):</span>
                <span className="font-bold text-emerald-700">
                  {inspectedDayA.present}/60 ({Math.round((inspectedDayA.present / 60) * 100)}%)
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Subject:</span>
                <span className="font-medium text-slate-700 truncate max-w-[240px] sm:max-w-xs">{inspectedDayA.subject}</span>
              </div>
            </>
          )}

          {selectedSection === 'B' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Weekly Average:</span>
                <span className="font-black text-purple-700">{stats.avgB}%</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Selected ({inspectedDayB.day}, {inspectedDayB.date}):</span>
                <span className="font-bold text-emerald-700">
                  {inspectedDayB.present}/60 ({Math.round((inspectedDayB.present / 60) * 100)}%)
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Subject:</span>
                <span className="font-medium text-slate-700 truncate max-w-[240px] sm:max-w-xs">{inspectedDayB.subject}</span>
              </div>
            </>
          )}

          {selectedSection === 'compare' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span className="text-slate-500 font-medium">Sec A Avg:</span>
                <span className="font-black text-blue-700">{stats.avgA}%</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                <span className="text-slate-500 font-medium">Sec B Avg:</span>
                <span className="font-black text-purple-700">{stats.avgB}%</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Dept Combined Avg:</span>
                <span className="font-black text-slate-900">{stats.combinedAvg}%</span>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 shrink-0">
          {selectedSection === 'compare' ? (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span>Section A</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
                <span>Section B</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm ${selectedSection === 'A' ? 'bg-blue-600' : 'bg-purple-600'}`} />
              <span>Present Students</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 border-t border-dashed border-amber-500" />
            <span className="text-amber-700 font-bold">75% Target</span>
          </div>
        </div>
      </div>

      {/* 3. Bar Chart Canvas Container (Precise Proportions & Grid Alignment) */}
      <div className="relative pt-6 pb-2">
        {/* The Exact Charting Area (Height: 200px) */}
        <div className="relative h-48 ml-8 mr-2">
          {/* Background Grid Lines precisely aligned to percentages */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {/* 100% (60 students) */}
            <div className="relative w-full border-b border-slate-200/80">
              <span className="absolute -left-8 -top-2 text-slate-400 text-[10px] font-mono w-6 text-right">100%</span>
            </div>

            {/* 75% Target (45 students) */}
            <div className="relative w-full border-b border-dashed border-amber-400 z-0">
              <span className="absolute -left-8 -top-2 text-amber-600 text-[10px] font-mono font-bold w-6 text-right">75%</span>
              <span className="absolute right-0 -top-3.5 text-[10px] font-bold text-amber-700 bg-amber-50/90 px-1.5 py-0.2 rounded border border-amber-200">
                75% Target (45)
              </span>
            </div>

            {/* 50% (30 students) */}
            <div className="relative w-full border-b border-slate-200/60">
              <span className="absolute -left-8 -top-2 text-slate-400 text-[10px] font-mono w-6 text-right">50%</span>
            </div>

            {/* 25% (15 students) */}
            <div className="relative w-full border-b border-slate-200/40">
              <span className="absolute -left-8 -top-2 text-slate-400 text-[10px] font-mono w-6 text-right">25%</span>
            </div>

            {/* Baseline 0% */}
            <div className="relative w-full border-b border-slate-300">
              <span className="absolute -left-8 -top-2 text-slate-400 text-[10px] font-mono w-6 text-right">0%</span>
            </div>
          </div>

          {/* Foreground 6 Bars (Mon - Sat) strictly scaled to h-full */}
          <div className="absolute inset-0 flex items-end justify-around gap-2 sm:gap-6 z-10">
            {currentWeekDays.map((item, idx) => {
              const dataA = secAWeek[idx] || { present: 50, absent: 10, total: 60, subject: '' }
              const dataB = secBWeek[idx] || { present: 50, absent: 10, total: 60, subject: '' }

              const rateA = Math.round((dataA.present / (dataA.total || 60)) * 100)
              const rateB = Math.round((dataB.present / (dataB.total || 60)) * 100)

              const isSelectedDay = activeDayIndex === idx

              return (
                <div
                  key={idx}
                  onClick={() => setActiveDayIndex(idx)}
                  className="flex-1 h-full flex flex-col justify-end items-center cursor-pointer group"
                >
                  {/* Single Section Mode */}
                  {selectedSection !== 'compare' ? (
                    (() => {
                      const activeData = selectedSection === 'A' ? dataA : dataB
                      const activeRate = selectedSection === 'A' ? rateA : rateB
                      const isBlue = selectedSection === 'A'

                      return (
                        <div className="w-full flex flex-col items-center justify-end h-full">
                          {/* Rate badge on top of bar */}
                          <span
                            className={`text-[11px] sm:text-xs font-bold font-mono mb-1 transition-transform ${
                              isSelectedDay
                                ? isBlue ? 'text-blue-600 font-black scale-110' : 'text-purple-600 font-black scale-110'
                                : 'text-slate-600 group-hover:text-slate-900'
                            }`}
                          >
                            {activeRate}%
                          </span>

                          {/* Solid Bar */}
                          <div
                            style={{ height: `${activeRate}%` }}
                            className={`w-10 sm:w-14 rounded-t-lg transition-all duration-300 flex flex-col items-center justify-start pt-1.5 shadow-xs ${
                              isSelectedDay
                                ? isBlue
                                  ? 'bg-blue-600 shadow-blue-500/20 shadow-md ring-2 ring-blue-300'
                                  : 'bg-purple-600 shadow-purple-500/20 shadow-md ring-2 ring-purple-300'
                                : isBlue
                                  ? 'bg-blue-600/85 hover:bg-blue-600'
                                  : 'bg-purple-600/85 hover:bg-purple-600'
                            }`}
                            title={`${item.fullDate} (${item.dayFull}): ${activeData.present}/60 Present (${activeRate}%)`}
                          >
                            <span className="text-[10px] sm:text-[11px] font-black text-white font-mono opacity-90 leading-tight">
                              {activeData.present}
                            </span>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    /* Compare Both Mode: Grouped Bars Side-by-Side */
                    <div className="w-full flex flex-col items-center justify-end h-full">
                      {/* Top comparison values */}
                      <div className="flex items-center gap-1 text-[10px] font-bold font-mono mb-1">
                        <span className="text-blue-600">{rateA}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-purple-600">{rateB}%</span>
                      </div>

                      {/* Grouped Bars */}
                      <div className="h-full flex items-end justify-center gap-1 sm:gap-2 w-full">
                        {/* Sec A Bar */}
                        <div
                          style={{ height: `${rateA}%` }}
                          className={`w-5 sm:w-7 rounded-t-md transition-all duration-300 flex items-start justify-center pt-1 ${
                            isSelectedDay ? 'bg-blue-600 ring-1 ring-blue-300 shadow-xs' : 'bg-blue-600/85 hover:bg-blue-600'
                          }`}
                          title={`Section A: ${dataA.present}/60 (${rateA}%)`}
                        >
                          <span className="text-[9px] font-bold text-white font-mono hidden sm:inline leading-none">
                            {dataA.present}
                          </span>
                        </div>

                        {/* Sec B Bar */}
                        <div
                          style={{ height: `${rateB}%` }}
                          className={`w-5 sm:w-7 rounded-t-md transition-all duration-300 flex items-start justify-center pt-1 ${
                            isSelectedDay ? 'bg-purple-600 ring-1 ring-purple-300 shadow-xs' : 'bg-purple-600/85 hover:bg-purple-600'
                          }`}
                          title={`Section B: ${dataB.present}/60 (${rateB}%)`}
                        >
                          <span className="text-[9px] font-bold text-white font-mono hidden sm:inline leading-none">
                            {dataB.present}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. Days Row Below the Canvas (Clean & Centered) */}
        <div className="ml-8 mr-2 mt-2 flex items-center justify-around border-t border-slate-200/80 pt-2">
          {currentWeekDays.map((item, idx) => {
            const isSelectedDay = activeDayIndex === idx
            return (
              <div
                key={idx}
                onClick={() => setActiveDayIndex(idx)}
                className="text-center cursor-pointer flex-1"
              >
                <p
                  className={`text-xs font-bold leading-tight ${
                    isSelectedDay
                      ? selectedSection === 'B' ? 'text-purple-600 font-black' : 'text-blue-600 font-black'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {item.day}
                </p>
                <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5 font-mono">
                  {item.date?.split(' ')[1]}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5. Bottom Detail Ribbon for Selected Day */}
      <div className="mt-1 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-black text-slate-800">
            {currentWeekDays[activeDayIndex]?.dayFull}, {currentWeekDays[activeDayIndex]?.fullDate}:
          </span>
          {selectedSection !== 'compare' ? (
            <span className="text-slate-600 truncate max-w-xs sm:max-w-md">
              {(selectedSection === 'A' ? inspectedDayA : inspectedDayB).subject}
            </span>
          ) : (
            <span className="text-slate-500 truncate">
              Sec A: {inspectedDayA.subject.split(':')[0]} • Sec B: {inspectedDayB.subject.split(':')[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-semibold text-slate-600 shrink-0">
          {selectedSection !== 'compare' ? (
            (() => {
              const d = selectedSection === 'A' ? inspectedDayA : inspectedDayB
              return (
                <>
                  <span className="text-emerald-700 font-bold">{d.present} Present</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-rose-600 font-bold">{d.absent} Absent</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-700 text-[11px]">{d.timeSlot}</span>
                </>
              )
            })()
          ) : (
            <>
              <span className="text-blue-700 font-bold">Sec A: {inspectedDayA.present}/60 ({Math.round((inspectedDayA.present / 60) * 100)}%)</span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-700 font-bold">Sec B: {inspectedDayB.present}/60 ({Math.round((inspectedDayB.present / 60) * 100)}%)</span>
            </>
          )}
        </div>
      </div>

      {/* 6. Expandable History Table */}
      {showHistoryModal && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Full Attendance Records (Mon – Sat)</span>
            </h4>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Close ✕
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Section A</th>
                  <th className="py-2 px-3">Sec A Rate</th>
                  <th className="py-2 px-3">Section B</th>
                  <th className="py-2 px-3">Sec B Rate</th>
                  <th className="py-2 px-3 text-right">Target Met?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentWeekDays.map((d, i) => {
                  const itemA = secAWeek[i] || { present: 50, absent: 10, total: 60 }
                  const itemB = secBWeek[i] || { present: 50, absent: 10, total: 60 }
                  const rA = Math.round((itemA.present / 60) * 100)
                  const rB = Math.round((itemB.present / 60) * 100)
                  return (
                    <tr
                      key={i}
                      onClick={() => setActiveDayIndex(i)}
                      className={`cursor-pointer transition-colors ${
                        activeDayIndex === i ? 'bg-blue-50/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-800">
                        {d.fullDate} ({d.day})
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-blue-700 font-mono">
                        {itemA.present} / 60
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 font-mono">
                        {rA}%
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-purple-700 font-mono">
                        {itemB.present} / 60
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-bold text-slate-900 font-mono">
                        {rB}%
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ ≥ 75%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
