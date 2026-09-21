import React, { useState, useMemo } from 'react'
import {
  BarChart3,
  Calendar,
  Users,
  Target,
  TrendingUp,
  GraduationCap,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  History,
  Search,
  Filter,
  Download,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  CalendarDays
} from 'lucide-react'

// Week 2 (Current Week: Sep 15 - Sep 21, 2026)
const WEEK_2_DATES = [
  { day: 'Mon', date: 'Sep 15', fullDate: 'Sep 15, 2026', dayFull: 'Monday', isoDate: '2026-09-15' },
  { day: 'Tue', date: 'Sep 16', fullDate: 'Sep 16, 2026', dayFull: 'Tuesday', isoDate: '2026-09-16' },
  { day: 'Wed', date: 'Sep 17', fullDate: 'Sep 17, 2026', dayFull: 'Wednesday', isoDate: '2026-09-17' },
  { day: 'Thu', date: 'Sep 18', fullDate: 'Sep 18, 2026', dayFull: 'Thursday', isoDate: '2026-09-18' },
  { day: 'Fri', date: 'Sep 19', fullDate: 'Sep 19, 2026', dayFull: 'Friday', isoDate: '2026-09-19' },
  { day: 'Sat', date: 'Sep 20', fullDate: 'Sep 20, 2026', dayFull: 'Saturday', isoDate: '2026-09-20' },
  { day: 'Sun', date: 'Sep 21', fullDate: 'Sep 21, 2026', dayFull: 'Sunday', isoDate: '2026-09-21' }
]

// Week 1 (Previous Week: Sep 08 - Sep 14, 2026)
const WEEK_1_DATES = [
  { day: 'Mon', date: 'Sep 08', fullDate: 'Sep 08, 2026', dayFull: 'Monday', isoDate: '2026-09-08' },
  { day: 'Tue', date: 'Sep 09', fullDate: 'Sep 09, 2026', dayFull: 'Tuesday', isoDate: '2026-09-09' },
  { day: 'Wed', date: 'Sep 10', fullDate: 'Sep 10, 2026', dayFull: 'Wednesday', isoDate: '2026-09-10' },
  { day: 'Thu', date: 'Sep 11', fullDate: 'Sep 11, 2026', dayFull: 'Thursday', isoDate: '2026-09-11' },
  { day: 'Fri', date: 'Sep 12', fullDate: 'Sep 12, 2026', dayFull: 'Friday', isoDate: '2026-09-12' },
  { day: 'Sat', date: 'Sep 13', fullDate: 'Sep 13, 2026', dayFull: 'Saturday', isoDate: '2026-09-13' },
  { day: 'Sun', date: 'Sep 14', fullDate: 'Sep 14, 2026', dayFull: 'Sunday', isoDate: '2026-09-14' }
]

// Section A Data (Year IV / Semester VII Timetable)
const SECTION_A_CONFIG = {
  sectionId: 'A',
  title: 'Section A',
  classroomCode: 'AIDS-1A',
  className: 'AI&DS Year IV (Sem VII) — Section A',
  totalStudents: 60,
  accentColor: 'blue',
  lastUpdated: '10:32 AM',
  weeks: {
    week2: [
      { ...WEEK_2_DATES[0], present: 54, absent: 6, total: 60, rateChange: '+4%', subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[1], present: 56, absent: 4, total: 60, rateChange: '+3%', subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[2], present: 52, absent: 8, total: 60, rateChange: '-4%', subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '09:20 - 11:15 AM' },
      { ...WEEK_2_DATES[3], present: 55, absent: 5, total: 60, rateChange: '+6%', subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[4], present: 53, absent: 7, total: 60, rateChange: '+2%', subject: 'PSS: Placement Soft Skill Training', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[5], present: 57, absent: 3, total: 60, rateChange: '+8%', subject: 'PAT: Placement Aptitude & Technical', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_2_DATES[6], present: 55, absent: 5, total: 60, rateChange: '+5%', subject: 'Capstone Project Evaluation & Viva', timeSlot: '10:00 - 12:00 PM' }
    ],
    week1: [
      { ...WEEK_1_DATES[0], present: 52, absent: 8, total: 60, rateChange: '+2%', subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[1], present: 54, absent: 6, total: 60, rateChange: '+3%', subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[2], present: 50, absent: 10, total: 60, rateChange: '-5%', subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '09:20 - 11:15 AM' },
      { ...WEEK_1_DATES[3], present: 53, absent: 7, total: 60, rateChange: '+4%', subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[4], present: 51, absent: 9, total: 60, rateChange: '+1%', subject: 'PSS: Placement Soft Skill Training', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[5], present: 55, absent: 5, total: 60, rateChange: '+6%', subject: 'PAT: Placement Aptitude & Technical', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_1_DATES[6], present: 52, absent: 8, total: 60, rateChange: '-2%', subject: 'Capstone Project Evaluation & Viva', timeSlot: '10:00 - 12:00 PM' }
    ]
  }
}

// Section B Data (Shuffled Timetable)
const SECTION_B_CONFIG = {
  sectionId: 'B',
  title: 'Section B',
  classroomCode: 'AIDS-1B',
  className: 'AI&DS Year IV (Sem VII) — Section B (Shuffled)',
  totalStudents: 60,
  accentColor: 'purple',
  lastUpdated: '10:32 AM',
  weeks: {
    week2: [
      { ...WEEK_2_DATES[0], present: 55, absent: 5, total: 60, rateChange: '+3%', subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[1], present: 57, absent: 3, total: 60, rateChange: '+5%', subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[2], present: 53, absent: 7, total: 60, rateChange: '-2%', subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_2_DATES[3], present: 56, absent: 4, total: 60, rateChange: '+7%', subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '09:20 - 10:10 AM' },
      { ...WEEK_2_DATES[4], present: 54, absent: 6, total: 60, rateChange: '+4%', subject: 'SR: Skill Rack Problem Solving', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_2_DATES[5], present: 58, absent: 2, total: 60, rateChange: '+10%', subject: 'PL: Placement Mock Interview & Prep', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_2_DATES[6], present: 54, absent: 6, total: 60, rateChange: '+2%', subject: 'Capstone Project Review & Viva', timeSlot: '01:30 - 03:30 PM' }
    ],
    week1: [
      { ...WEEK_1_DATES[0], present: 53, absent: 7, total: 60, rateChange: '+2%', subject: 'GE3751: Principles Of Management (POM)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[1], present: 55, absent: 5, total: 60, rateChange: '+4%', subject: 'AI3021: IT in Agricultural System (ITAS)', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[2], present: 51, absent: 9, total: 60, rateChange: '-3%', subject: 'OME354: Applied Design Thinking (ADT)', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_1_DATES[3], present: 54, absent: 6, total: 60, rateChange: '+5%', subject: 'GE3791: Human Values & Ethics (HVE)', timeSlot: '09:20 - 10:10 AM' },
      { ...WEEK_1_DATES[4], present: 52, absent: 8, total: 60, rateChange: '+2%', subject: 'SR: Skill Rack Problem Solving', timeSlot: '08:30 - 09:20 AM' },
      { ...WEEK_1_DATES[5], present: 56, absent: 4, total: 60, rateChange: '+8%', subject: 'PL: Placement Mock Interview & Prep', timeSlot: '08:30 - 10:10 AM' },
      { ...WEEK_1_DATES[6], present: 53, absent: 7, total: 60, rateChange: '-1%', subject: 'Capstone Project Review & Viva', timeSlot: '01:30 - 03:30 PM' }
    ]
  }
}

/**
 * Single Section Attendance Card UI
 * Synchronized with the global selectedDate so in Compare mode, both sections ALWAYS show the same date!
 */
function SectionOverviewCard({
  config,
  selectedWeek,
  selectedDateIndex,
  onSelectDateIndex,
  hoveredIndex,
  onHoverIndex,
  isHighlighted,
  onTouch,
  onOpenHistory
}) {
  const [timeframe, setTimeframe] = useState('This Week')
  const [selectedClass, setSelectedClass] = useState('All Classes')

  const weeksMap = config?.weeks || SECTION_A_CONFIG.weeks
  const weeklyData = weeksMap?.[selectedWeek] || weeksMap?.week2 || []
  const activeDay = (weeklyData && weeklyData[selectedDateIndex]) || (weeklyData && weeklyData[weeklyData.length - 1]) || (weeklyData && weeklyData[0]) || {
    present: 53,
    absent: 7,
    total: 60,
    rateChange: '+5%',
    subject: 'AI Project Evaluation',
    fullDate: 'Sep 21, 2026',
    date: 'Sep 21',
    day: 'Sun',
    dayFull: 'Sunday'
  }

  const present = activeDay?.present ?? 0
  const absent = activeDay?.absent ?? 0
  const total = activeDay?.total || 60
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  const rateChange = activeDay?.rateChange || '0%'

  // Max value for Y-axis scaling (80)
  const Y_MAX = 80

  const isBlue = config.sectionId === 'A'
  const badgeBg = isBlue ? 'bg-blue-600' : 'bg-purple-600'
  const accentLight = isBlue ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'

  return (
    <div
      onClick={onTouch}
      className={`bg-white rounded-[28px] border transition-all duration-500 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden ${
        isHighlighted
          ? isBlue
            ? 'border-blue-500/80 ring-4 ring-blue-500/15 shadow-xl scale-[1.008] -translate-y-0.5'
            : 'border-purple-500/80 ring-4 ring-purple-500/15 shadow-xl scale-[1.008] -translate-y-0.5'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${accentLight} flex items-center justify-center shadow-xs`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Attendance Overview
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black text-white uppercase tracking-wide ${badgeBg}`}>
                {config.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {config.className} • {activeDay.subject}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Timeframe & Synchronized Date Display */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
            {['Today', 'This Week', 'This Month'].map((tf) => (
              <button
                key={tf}
                onClick={(e) => {
                  e.stopPropagation()
                  setTimeframe(tf)
                }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === tf
                    ? isBlue ? 'bg-blue-600 text-white shadow-xs' : 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Synchronized Date Badge — Always shows the exact active date */}
          <div
            title={`Active Date: ${activeDay.fullDate}`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs"
          >
            <Calendar className={`w-3.5 h-3.5 ${isBlue ? 'text-blue-600' : 'text-purple-600'}`} />
            <span className="font-mono">{activeDay.fullDate}</span>
          </div>

          {onOpenHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenHistory()
              }}
              title="Open full attendance history logs"
              className="p-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Present */}
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d1fae5] text-[#059669] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{present}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Present</p>
            </div>
          </div>
          <span className="bg-[#d1fae5] text-[#059669] text-xs font-bold px-2.5 py-1 rounded-full">
            {Math.round((present / total) * 100)}%
          </span>
        </div>

        {/* Card 2: Absent */}
        <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ffe4e6] text-[#e11d48] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{absent}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Absent</p>
            </div>
          </div>
          <span className="bg-[#ffe4e6] text-[#e11d48] text-xs font-bold px-2.5 py-1 rounded-full">
            {Math.round((absent / total) * 100)}%
          </span>
        </div>

        {/* Card 3: Total Students */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{total}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Total Students</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Fixed Cap</span>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="bg-[#faf5ff] border border-[#e9d5ff] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{rate}%</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Attendance Rate</p>
            </div>
          </div>
          <span className={`text-xs font-extrabold flex items-center gap-0.5 ${rateChange.startsWith('+') ? 'text-[#059669]' : 'text-rose-600'}`}>
            <span>{rateChange.startsWith('+') ? '↑' : '↓'} {rateChange}</span>
            <span className="text-[10px] text-slate-400 font-normal">vs prev</span>
          </span>
        </div>
      </div>

      {/* Daily Attendance Stacked Bar Chart Area */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs mb-6">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${isBlue ? 'text-blue-600' : 'text-purple-600'}`} />
            <h3 className="font-bold text-slate-900 text-sm">
              Daily Attendance ({selectedWeek === 'week2' ? 'Week 2' : 'Week 1'})
            </h3>
            <span className="text-xs font-semibold text-slate-400 ml-1">
              — Click any day to inspect that date
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
            <span>{selectedClass}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Stacked Bars Visualization with Y-Axis */}
        <div className="relative pt-6 pb-2">
          {/* Horizontal grid lines */}
          <div className="absolute inset-x-0 top-6 bottom-16 flex flex-col justify-between pointer-events-none text-[11px] font-semibold text-slate-300">
            {[80, 60, 40, 20, 0].map((val) => (
              <div key={val} className="flex items-center gap-3 w-full">
                <span className="w-6 text-right text-slate-400 text-[10px] font-mono">{val}</span>
                <div className="flex-1 border-b border-slate-100" />
              </div>
            ))}
          </div>

          {/* 7 Stacked Bars — Synchronized with selectedDateIndex & hoveredIndex */}
          <div className="relative z-10 pl-9 pr-2 h-52 flex items-end justify-between gap-3 sm:gap-6">
            {weeklyData.map((item, idx) => {
              const isSelected = selectedDateIndex === idx
              const isHovered = hoveredIndex === idx
              const presentHeightPct = (item.present / Y_MAX) * 100
              const absentHeightPct = (item.absent / Y_MAX) * 100

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectDateIndex(idx)
                  }}
                  onMouseEnter={() => onHoverIndex(idx)}
                  onMouseLeave={() => onHoverIndex(null)}
                  className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all duration-300 transform ${
                    isSelected ? 'scale-105 -translate-y-1.5' : isHovered ? '-translate-y-1' : ''
                  }`}
                >
                  {/* Total on top of bar */}
                  <span className={`text-xs font-bold mb-1.5 transition-all ${
                    isSelected ? 'text-blue-600 font-extrabold scale-110' : 'text-slate-700 opacity-90 group-hover:opacity-100'
                  }`}>
                    {item.total}
                  </span>

                  {/* Stacked Container with Active Selection Ring */}
                  <div
                    className={`w-10 sm:w-12 flex flex-col items-center justify-end overflow-hidden rounded-2xl shadow-xs transition-all duration-300 ${
                      isSelected
                        ? isBlue
                          ? 'ring-4 ring-blue-500/40 shadow-lg'
                          : 'ring-4 ring-purple-500/40 shadow-lg'
                        : isHovered
                          ? 'ring-2 ring-slate-400/40 shadow-md'
                          : 'group-hover:shadow-md'
                    }`}
                  >
                    {/* Top Segment: Coral/Pink Absent */}
                    <div
                      style={{ height: `${absentHeightPct * 2.2}px` }}
                      className="w-full bg-[#ff5a79] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-300 hover:bg-[#ff4267]"
                      title={`${item.date}: Absent ${item.absent}`}
                    >
                      {item.absent}
                    </div>

                    {/* Bottom Segment: Emerald/Green Present */}
                    <div
                      style={{ height: `${presentHeightPct * 2.2}px` }}
                      className="w-full bg-[#00c676] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-300 hover:bg-[#00b26a]"
                      title={`${item.date}: Present ${item.present}`}
                    >
                      {item.present}
                    </div>
                  </div>

                  {/* Day and Date Labels */}
                  <div className={`mt-3 text-center transition-all ${
                    isSelected ? 'scale-105' : ''
                  }`}>
                    <p className={`text-xs font-bold leading-tight transition-colors ${
                      isSelected
                        ? isBlue ? 'text-blue-600 font-black' : 'text-purple-600 font-black'
                        : 'text-slate-800 group-hover:text-blue-600'
                    }`}>
                      {item.day}
                    </p>
                    <p className={`text-[10px] font-medium leading-none mt-0.5 ${
                      isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}>
                      {item.date}
                    </p>
                    {isSelected && (
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 ${isBlue ? 'bg-blue-600' : 'bg-purple-600'}`} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00c676]" />
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5a79]" />
              <span className="text-slate-600">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-500 font-medium">Selected: {activeDay.fullDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer within card */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${accentLight} flex items-center justify-center`}>
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-700">AIoT Smart Classroom</span>
            <span className="hidden sm:inline text-slate-400 mx-1.5">•</span>
            <span className="hidden sm:inline">Real-Time Attendance & Communication</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {config.lastUpdated}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Attendance History Log Component
 * Comprehensive historical view for both sections across all recorded dates.
 */
function AttendanceHistoryView({ onSelectRecordForComparison, onSelectRecordForFocus }) {
  const [filterSection, setFilterSection] = useState('ALL') // 'ALL', 'A', 'B'
  const [filterPeriod, setFilterPeriod] = useState('ALL') // 'ALL', 'week2', 'week1'
  const [searchQuery, setSearchQuery] = useState('')

  // Flatten all historical records
  const allHistoryRecords = useMemo(() => {
    const records = []
    
    // Process week 2
    SECTION_A_CONFIG.weeks.week2.forEach((item, idx) => {
      records.push({
        id: `A-w2-${idx}`,
        sectionId: 'A',
        sectionTitle: 'Section A',
        classroomCode: 'AIDS-1A',
        weekKey: 'week2',
        weekLabel: 'Week 2 (Current)',
        dateIndex: idx,
        ...item,
        rate: Math.round((item.present / item.total) * 100),
        status: 'Completed'
      })
    })

    SECTION_B_CONFIG.weeks.week2.forEach((item, idx) => {
      records.push({
        id: `B-w2-${idx}`,
        sectionId: 'B',
        sectionTitle: 'Section B',
        classroomCode: 'AIDS-1B',
        weekKey: 'week2',
        weekLabel: 'Week 2 (Current)',
        dateIndex: idx,
        ...item,
        rate: Math.round((item.present / item.total) * 100),
        status: 'Completed'
      })
    })

    // Process week 1
    SECTION_A_CONFIG.weeks.week1.forEach((item, idx) => {
      records.push({
        id: `A-w1-${idx}`,
        sectionId: 'A',
        sectionTitle: 'Section A',
        classroomCode: 'AIDS-1A',
        weekKey: 'week1',
        weekLabel: 'Week 1 (Previous)',
        dateIndex: idx,
        ...item,
        rate: Math.round((item.present / item.total) * 100),
        status: 'Completed'
      })
    })

    SECTION_B_CONFIG.weeks.week1.forEach((item, idx) => {
      records.push({
        id: `B-w1-${idx}`,
        sectionId: 'B',
        sectionTitle: 'Section B',
        classroomCode: 'AIDS-1B',
        weekKey: 'week1',
        weekLabel: 'Week 1 (Previous)',
        dateIndex: idx,
        ...item,
        rate: Math.round((item.present / item.total) * 100),
        status: 'Completed'
      })
    })

    // Sort descending by ISO date
    return records.sort((a, b) => b.isoDate.localeCompare(a.isoDate) || a.sectionId.localeCompare(b.sectionId))
  }, [])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allHistoryRecords.filter((rec) => {
      if (filterSection !== 'ALL' && rec.sectionId !== filterSection) return false
      if (filterPeriod !== 'ALL' && rec.weekKey !== filterPeriod) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          rec.date.toLowerCase().includes(q) ||
          rec.fullDate.toLowerCase().includes(q) ||
          rec.dayFull.toLowerCase().includes(q) ||
          rec.subject.toLowerCase().includes(q) ||
          rec.sectionTitle.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allHistoryRecords, filterSection, filterPeriod, searchQuery])

  // Summary statistics for filtered history
  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return { avgRate: 0, totalChecked: 0, highest: null, lowest: null }
    const totalPresent = filteredRecords.reduce((sum, r) => sum + r.present, 0)
    const totalStudents = filteredRecords.reduce((sum, r) => sum + r.total, 0)
    const avgRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0

    let highest = filteredRecords[0]
    let lowest = filteredRecords[0]
    filteredRecords.forEach((r) => {
      if (r.rate > highest.rate) highest = r
      if (r.rate < lowest.rate) lowest = r
    })

    return { avgRate, totalChecked: totalStudents, totalPresent, highest, lowest }
  }, [filteredRecords])

  const exportCSV = () => {
    const headers = ['Date', 'Day', 'Section', 'Classroom', 'Subject', 'Time Slot', 'Total', 'Present', 'Absent', 'Rate %', 'Status']
    const rows = filteredRecords.map((r) => [
      r.fullDate,
      r.dayFull,
      r.sectionTitle,
      r.classroomCode,
      `"${r.subject}"`,
      `"${r.timeSlot}"`,
      r.total,
      r.present,
      r.absent,
      `${r.rate}%`,
      r.status
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `smart_classroom_attendance_history_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-[28px] border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
      {/* History Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Attendance History & Logs
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white uppercase tracking-wide">
                {filteredRecords.length} Sessions Recorded
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Historical logs across Section A & Section B • Click any session to inspect or compare that exact date
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export History CSV</span>
        </button>
      </div>

      {/* Summary KPI Cards for Filtered History */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Historical Avg Attendance</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.avgRate}%</p>
          <p className="text-[11px] font-medium text-emerald-600 mt-0.5">
            {stats.totalPresent} attendances verified
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Highest Attended Session</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {stats.highest ? `${stats.highest.rate}%` : '—'}
          </p>
          <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
            {stats.highest ? `${stats.highest.sectionTitle} (${stats.highest.date})` : '—'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Lowest Attended Session</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {stats.lowest ? `${stats.lowest.rate}%` : '—'}
          </p>
          <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
            {stats.lowest ? `${stats.lowest.sectionTitle} (${stats.lowest.date})` : '—'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Verified Sessions</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{filteredRecords.length}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Across 2 Sections</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        {/* Section Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Section:
          </span>
          {[
            { key: 'ALL', label: 'All Sections' },
            { key: 'A', label: 'Section A' },
            { key: 'B', label: 'Section B' }
          ].map((sec) => (
            <button
              key={sec.key}
              onClick={() => setFilterSection(sec.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterSection === sec.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200/70'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>

        {/* Period Filter & Search */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Periods (Both Weeks)</option>
            <option value="week2">Current Week 2 (Sep 15 - 21)</option>
            <option value="week1">Previous Week 1 (Sep 08 - 14)</option>
          </select>

          <div className="relative flex-1 md:w-56 md:flex-none">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subject / date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Date & Day</th>
              <th className="py-3 px-4">Section</th>
              <th className="py-3 px-4">Subject / Course</th>
              <th className="py-3 px-4">Time Slot</th>
              <th className="py-3 px-4 text-center">Present / Total</th>
              <th className="py-3 px-4 text-center">Absent</th>
              <th className="py-3 px-4">Attendance Rate</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                  No attendance history matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-blue-50/40 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rec.fullDate}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({rec.day})</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                        rec.sectionId === 'A'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {rec.sectionTitle}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                    {rec.subject}
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {rec.timeSlot}
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="font-black text-emerald-600">{rec.present}</span>
                    <span className="text-slate-400 font-bold"> / {rec.total}</span>
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="font-bold text-rose-500">{rec.absent}</span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${rec.rate}%` }}
                          className={`h-full rounded-full ${
                            rec.rate >= 85 ? 'bg-emerald-500' : rec.rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        />
                      </div>
                      <span className="font-black text-slate-900 text-xs w-9 text-right font-mono">
                        {rec.rate}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                    <button
                      onClick={() => onSelectRecordForComparison(rec.weekKey, rec.dateIndex)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                      title="Open both sections side-by-side on this same date"
                    >
                      <span>Compare Date</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onSelectRecordForFocus(rec.sectionId, rec.weekKey, rec.dateIndex)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition-colors"
                      title="Focus on this section and date"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Side-by-Side Same-Date Comparison Matrix
 * Explicitly compares Section A and Section B on the exact same date.
 */
function SameDateComparisonMatrix({
  selectedWeek,
  selectedDateIndex,
  onSelectDateIndex
}) {
  const dates = selectedWeek === 'week2' ? WEEK_2_DATES : WEEK_1_DATES
  const secAWeek = SECTION_A_CONFIG.weeks?.[selectedWeek] || SECTION_A_CONFIG.weeks.week2 || []
  const secBWeek = SECTION_B_CONFIG.weeks?.[selectedWeek] || SECTION_B_CONFIG.weeks.week2 || []

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Side-by-Side Comparison Matrix (Synchronized by Date)</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Both Section A and Section B are aligned to the identical calendar date for strict experimental and institutional parity
          </p>
        </div>
        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
          Comparing {dates.length} Days in {selectedWeek === 'week2' ? 'Week 2 (Sep 15 - 21)' : 'Week 1 (Sep 08 - 14)'}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Exact Date</th>
              <th className="py-3 px-4 text-blue-700">Section A (AIDS-1A)</th>
              <th className="py-3 px-4 text-purple-700">Section B (AIDS-1B)</th>
              <th className="py-3 px-4 text-center">Variance / Delta</th>
              <th className="py-3 px-4 text-center">Combined Dept Attendance</th>
              <th className="py-3 px-4 text-right">Synchronize</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {dates.map((d, idx) => {
              const aItem = secAWeek[idx] || { present: 50, absent: 10, total: 60 }
              const bItem = secBWeek[idx] || { present: 50, absent: 10, total: 60 }
              const aTot = aItem.total || 60
              const bTot = bItem.total || 60
              const aRate = Math.round(((aItem.present ?? 50) / aTot) * 100)
              const bRate = Math.round(((bItem.present ?? 50) / bTot) * 100)
              const diff = aRate - bRate
              const combinedPresent = (aItem.present ?? 50) + (bItem.present ?? 50)
              const combinedTotal = aTot + bTot
              const combinedRate = Math.round((combinedPresent / (combinedTotal || 120)) * 100)
              const isSelected = selectedDateIndex === idx

              return (
                <tr
                  key={idx}
                  onClick={() => onSelectDateIndex(idx)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 font-bold ring-1 ring-blue-500/20'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-slate-300'}`} />
                      <span className="font-black text-slate-900">{d.fullDate}</span>
                      <span className="text-slate-400 font-semibold">({d.day})</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-600 font-mono text-sm">{aRate}%</span>
                      <span className="text-slate-400 text-[11px]">({aItem.present}/60 present)</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-purple-600 font-mono text-sm">{bRate}%</span>
                      <span className="text-slate-400 text-[11px]">({bItem.present}/60 present)</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {diff === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Equal (0%)
                      </span>
                    ) : diff > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        + {diff}% Section A
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        + {Math.abs(diff)}% Section B
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                    <span>{combinedRate}%</span>
                    <span className="text-slate-400 font-normal text-[11px] ml-1.5">
                      ({combinedPresent}/{combinedTotal})
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectDateIndex(idx)
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? 'Active Date' : 'Show Date'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Main AttendanceOverview Container.
 * Supports:
 * - 2 Sections (Section A: 60 students, Section B: 60 students)
 * - Motion effects when admin touches / clicks a specific section
 * - Seamless toggle between Focused View, Side-by-Side Compare, or Attendance History
 * - SYNCHRONIZED DATE STATE: In Compare mode, both Section A and Section B show the exact same date!
 * - Complete Attendance History with multi-week sessions, filtering, and export.
 */
export default function AttendanceOverview() {
  const [activeSection, setActiveSection] = useState('A')
  const [viewMode, setViewMode] = useState('single') // 'single', 'both', 'history'
  const [selectedWeek, setSelectedWeek] = useState('week2') // 'week2' (Current), 'week1' (Previous)
  const [selectedDateIndex, setSelectedDateIndex] = useState(6) // default: Sunday Sep 21 (latest date)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [touchMotion, setTouchMotion] = useState(false)

  const activeDates = selectedWeek === 'week2' ? WEEK_2_DATES : WEEK_1_DATES
  const currentSyncedDate = activeDates[selectedDateIndex] || activeDates[activeDates.length - 1] || activeDates[0] || {
    day: 'Sun', date: 'Sep 21', fullDate: 'Sep 21, 2026', dayFull: 'Sunday'
  }

  const handleSectionTouch = (secId) => {
    setActiveSection(secId)
    // Trigger tactile motion feedback
    setTouchMotion(true)
    setTimeout(() => setTouchMotion(false), 600)
  }

  const handlePrevDay = () => {
    setSelectedDateIndex((prev) => (prev > 0 ? prev - 1 : activeDates.length - 1))
  }

  const handleNextDay = () => {
    setSelectedDateIndex((prev) => (prev < activeDates.length - 1 ? prev + 1 : 0))
  }

  return (
    <div className="space-y-4">
      {/* Top Interactive Section Touch & Navigation Selector Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: 2 Section Touch Cards */}
        <div className="flex items-center gap-3 flex-1">
          {/* Touch Card 1: Section A */}
          <button
            onClick={() => {
              if (viewMode === 'history') setViewMode('single')
              handleSectionTouch('A')
            }}
            className={`flex-1 p-3.5 rounded-2xl border text-left transition-all duration-300 transform-gpu cursor-pointer relative overflow-hidden group ${
              activeSection === 'A' && viewMode !== 'history'
                ? 'bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 border-blue-500 ring-4 ring-blue-500/15 shadow-md scale-[1.02] -translate-y-0.5'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 hover:scale-[1.01]'
            } ${touchMotion && activeSection === 'A' ? 'animate-bounce' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  activeSection === 'A' && viewMode !== 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                Section A
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                {SECTION_A_CONFIG.weeks?.[selectedWeek]?.[selectedDateIndex]?.present ?? 53} / 60 Present
              </span>
            </div>
            <p className="text-xs font-extrabold text-slate-800 truncate">
              AI&DS Year 1 — Section A
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              60 Students • AIDS-1A • On {currentSyncedDate?.date || 'Sep 21'}
            </p>
            {activeSection === 'A' && viewMode !== 'history' && (
              <span className="absolute bottom-0 inset-x-0 h-1 bg-blue-600 rounded-b-2xl" />
            )}
          </button>

          {/* Touch Card 2: Section B */}
          <button
            onClick={() => {
              if (viewMode === 'history') setViewMode('single')
              handleSectionTouch('B')
            }}
            className={`flex-1 p-3.5 rounded-2xl border text-left transition-all duration-300 transform-gpu cursor-pointer relative overflow-hidden group ${
              activeSection === 'B' && viewMode !== 'history'
                ? 'bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/60 border-purple-500 ring-4 ring-purple-500/15 shadow-md scale-[1.02] -translate-y-0.5'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 hover:scale-[1.01]'
            } ${touchMotion && activeSection === 'B' ? 'animate-bounce' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  activeSection === 'B' && viewMode !== 'history'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                Section B
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                {SECTION_B_CONFIG.weeks?.[selectedWeek]?.[selectedDateIndex]?.present ?? 52} / 60 Present
              </span>
            </div>
            <p className="text-xs font-extrabold text-slate-800 truncate">
              AI&DS Year 1 — Section B
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              60 Students • AIDS-1B • On {currentSyncedDate?.date || 'Sep 21'}
            </p>
            {activeSection === 'B' && viewMode !== 'history' && (
              <span className="absolute bottom-0 inset-x-0 h-1 bg-purple-600 rounded-b-2xl" />
            )}
          </button>
        </div>

        {/* Right: View Mode Switcher (Single, Compare Both, History) */}
        <div className="flex items-center gap-1.5 self-end md:self-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewMode === 'single'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Focused View
          </button>

          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'both'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compare Both Sections</span>
          </button>

          <button
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Attendance History</span>
          </button>
        </div>
      </div>

      {/* SYNCHRONIZED DATE CONTROL BAR (Especially vital in Compare Both Sections mode) */}
      {viewMode !== 'history' && (
        <div className="bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/90 p-3 sm:p-4 rounded-2xl border border-blue-200/60 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Left: Synchronized Date Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900">
                  {viewMode === 'both' ? 'Synchronized Comparison Date:' : 'Active Inspected Date:'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white font-mono">
                  {currentSyncedDate.fullDate} ({currentSyncedDate.dayFull})
                </span>
                {viewMode === 'both' && (
                  <span className="hidden sm:inline-block text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Both Sections Locked to Same Date
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Switching dates immediately updates both Section A and Section B to the identical date
              </p>
            </div>
          </div>

          {/* Right: Quick Day Buttons + Prev/Next Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Week Selector Dropdown */}
            <select
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value)
                setSelectedDateIndex(0)
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="week2">Current Week (Sep 15 - 21)</option>
              <option value="week1">Previous Week (Sep 08 - 14)</option>
            </select>

            {/* Quick 7-Day Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {activeDates.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDateIndex(idx)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedDateIndex === idx
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={`${item.fullDate} (${item.dayFull})`}
                >
                  {item.day}
                </button>
              ))}

              <button
                onClick={handleNextDay}
                title="Next Day"
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW ACCORDING TO VIEW MODE */}
      {viewMode === 'single' && (
        <div className="transition-all duration-500 ease-out transform">
          {activeSection === 'A' ? (
            <SectionOverviewCard
              config={SECTION_A_CONFIG}
              selectedWeek={selectedWeek}
              selectedDateIndex={selectedDateIndex}
              onSelectDateIndex={setSelectedDateIndex}
              hoveredIndex={hoveredIndex}
              onHoverIndex={setHoveredIndex}
              isHighlighted={true}
              onTouch={() => handleSectionTouch('A')}
              onOpenHistory={() => setViewMode('history')}
            />
          ) : (
            <SectionOverviewCard
              config={SECTION_B_CONFIG}
              selectedWeek={selectedWeek}
              selectedDateIndex={selectedDateIndex}
              onSelectDateIndex={setSelectedDateIndex}
              hoveredIndex={hoveredIndex}
              onHoverIndex={setHoveredIndex}
              isHighlighted={true}
              onTouch={() => handleSectionTouch('B')}
              onOpenHistory={() => setViewMode('history')}
            />
          )}
        </div>
      )}

      {viewMode === 'both' && (
        <div className="space-y-6 transition-all duration-500 ease-out">
          {/* Side-by-Side Dual Section Cards — GUARANTEED SAME DATE FOR ALL */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SectionOverviewCard
              config={SECTION_A_CONFIG}
              selectedWeek={selectedWeek}
              selectedDateIndex={selectedDateIndex}
              onSelectDateIndex={setSelectedDateIndex}
              hoveredIndex={hoveredIndex}
              onHoverIndex={setHoveredIndex}
              isHighlighted={activeSection === 'A'}
              onTouch={() => handleSectionTouch('A')}
              onOpenHistory={() => setViewMode('history')}
            />
            <SectionOverviewCard
              config={SECTION_B_CONFIG}
              selectedWeek={selectedWeek}
              selectedDateIndex={selectedDateIndex}
              onSelectDateIndex={setSelectedDateIndex}
              hoveredIndex={hoveredIndex}
              onHoverIndex={setHoveredIndex}
              isHighlighted={activeSection === 'B'}
              onTouch={() => handleSectionTouch('B')}
              onOpenHistory={() => setViewMode('history')}
            />
          </div>

          {/* Same-Date Comparison Matrix */}
          <SameDateComparisonMatrix
            selectedWeek={selectedWeek}
            selectedDateIndex={selectedDateIndex}
            onSelectDateIndex={setSelectedDateIndex}
          />
        </div>
      )}

      {viewMode === 'history' && (
        <AttendanceHistoryView
          onSelectRecordForComparison={(weekKey, dateIndex) => {
            setSelectedWeek(weekKey)
            setSelectedDateIndex(dateIndex)
            setViewMode('both')
          }}
          onSelectRecordForFocus={(secId, weekKey, dateIndex) => {
            setActiveSection(secId)
            setSelectedWeek(weekKey)
            setSelectedDateIndex(dateIndex)
            setViewMode('single')
          }}
        />
      )}
    </div>
  )
}
