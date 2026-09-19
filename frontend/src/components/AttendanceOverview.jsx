import React, { useState } from 'react'
import {
  BarChart3,
  Calendar,
  Users,
  Target,
  TrendingUp,
  GraduationCap,
  Clock,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react'

// Section A Data (60 Students)
const SECTION_A_DATA = {
  sectionId: 'A',
  title: 'Section A',
  classroomCode: 'AIDS-1A',
  className: 'AI&DS Year 1 — Section A',
  totalStudents: 60,
  present: 48,
  absent: 12,
  rate: 80,
  rateChange: '+5%',
  lastUpdated: '10:32 AM',
  weekly: [
    { day: 'Mon', date: 'Sep 15', present: 48, absent: 12, total: 60 },
    { day: 'Tue', date: 'Sep 16', present: 50, absent: 10, total: 60 },
    { day: 'Wed', date: 'Sep 17', present: 45, absent: 15, total: 60 },
    { day: 'Thu', date: 'Sep 18', present: 52, absent: 8, total: 60 },
    { day: 'Fri', date: 'Sep 19', present: 46, absent: 14, total: 60 },
    { day: 'Sat', date: 'Sep 20', present: 55, absent: 5, total: 60 },
    { day: 'Sun', date: 'Sep 21', present: 53, absent: 7, total: 60 }
  ]
}

// Section B Data (60 Students)
const SECTION_B_DATA = {
  sectionId: 'B',
  title: 'Section B',
  classroomCode: 'AIDS-1B',
  className: 'AI&DS Year 1 — Section B',
  totalStudents: 60,
  present: 52,
  absent: 8,
  rate: 87,
  rateChange: '+3%',
  lastUpdated: '10:32 AM',
  weekly: [
    { day: 'Mon', date: 'Sep 15', present: 51, absent: 9, total: 60 },
    { day: 'Tue', date: 'Sep 16', present: 53, absent: 7, total: 60 },
    { day: 'Wed', date: 'Sep 17', present: 49, absent: 11, total: 60 },
    { day: 'Thu', date: 'Sep 18', present: 54, absent: 6, total: 60 },
    { day: 'Fri', date: 'Sep 19', present: 50, absent: 10, total: 60 },
    { day: 'Sat', date: 'Sep 20', present: 56, absent: 4, total: 60 },
    { day: 'Sun', date: 'Sep 21', present: 52, absent: 8, total: 60 }
  ]
}

/**
 * Single Section Attendance Overview UI matching the user-uploaded image exactly.
 */
function SectionOverviewCard({ data, isHighlighted, onTouch }) {
  const [timeframe, setTimeframe] = useState('Today')
  const [selectedClass, setSelectedClass] = useState('All Classes')
  const [hoveredBar, setHoveredBar] = useState(null)

  // Max value for Y-axis scaling (80 as seen in reference image)
  const Y_MAX = 80

  return (
    <div
      onClick={onTouch}
      className={`bg-white rounded-[28px] border transition-all duration-500 p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden ${
        isHighlighted
          ? 'border-blue-500/80 ring-4 ring-blue-500/15 shadow-xl scale-[1.008] -translate-y-0.5'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Subtle top section accent badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Attendance Overview
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white uppercase tracking-wide">
                {data.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Weekly class attendance at a glance — {data.className}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Timeframe Pills + Date Button */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
            {['Today', 'This Week', 'This Month'].map((tf) => (
              <button
                key={tf}
                onClick={(e) => {
                  e.stopPropagation()
                  setTimeframe(tf)
                }}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Sep 15, 2026</span>
          </div>
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
              <p className="text-3xl font-black text-slate-900 leading-none">{data.present}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Present</p>
            </div>
          </div>
          <span className="bg-[#d1fae5] text-[#059669] text-xs font-bold px-2.5 py-1 rounded-full">
            {Math.round((data.present / data.totalStudents) * 100)}%
          </span>
        </div>

        {/* Card 2: Absent */}
        <div className="bg-[#fff1f2] border border-[#fecdd3] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ffe4e6] text-[#e11d48] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{data.absent}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Absent</p>
            </div>
          </div>
          <span className="bg-[#ffe4e6] text-[#e11d48] text-xs font-bold px-2.5 py-1 rounded-full">
            {Math.round((data.absent / data.totalStudents) * 100)}%
          </span>
        </div>

        {/* Card 3: Total Students */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{data.totalStudents}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Total Students</p>
            </div>
          </div>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="bg-[#faf5ff] border border-[#e9d5ff] rounded-2xl p-4 flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 leading-none">{data.rate}%</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Attendance Rate</p>
            </div>
          </div>
          <span className="text-[#059669] text-xs font-extrabold flex items-center gap-0.5">
            <span>↑ {data.rateChange}</span>
            <span className="text-[10px] text-slate-400 font-normal">vs. last class</span>
          </span>
        </div>
      </div>

      {/* Daily Attendance Stacked Bar Chart Area */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs mb-6">
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Daily Attendance (This Week)</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
            <span>{selectedClass}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Stacked Bars Visualization with Y-Axis */}
        <div className="relative pt-6 pb-2">
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-x-0 top-6 bottom-16 flex flex-col justify-between pointer-events-none text-[11px] font-semibold text-slate-300">
            {[80, 60, 40, 20, 0].map((val) => (
              <div key={val} className="flex items-center gap-3 w-full">
                <span className="w-6 text-right text-slate-400 text-[10px] font-mono">{val}</span>
                <div className="flex-1 border-b border-slate-100" />
              </div>
            ))}
          </div>

          {/* 7 Stacked Bars */}
          <div className="relative z-10 pl-9 pr-2 h-52 flex items-end justify-between gap-3 sm:gap-6">
            {data.weekly.map((item, idx) => {
              const presentHeightPct = (item.present / Y_MAX) * 100
              const absentHeightPct = (item.absent / Y_MAX) * 100

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Total on top of bar */}
                  <span className="text-xs font-bold text-slate-700 mb-1.5 opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                    {item.total}
                  </span>

                  {/* Stacked Container */}
                  <div className="w-10 sm:w-12 flex flex-col items-center justify-end overflow-hidden rounded-2xl shadow-xs transition-all duration-500 group-hover:shadow-md">
                    {/* Top Segment: Coral/Pink Absent */}
                    <div
                      style={{ height: `${absentHeightPct * 2.2}px` }}
                      className="w-full bg-[#ff5a79] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500 hover:bg-[#ff4267]"
                      title={`Absent: ${item.absent}`}
                    >
                      {item.absent}
                    </div>

                    {/* Bottom Segment: Emerald/Green Present */}
                    <div
                      style={{ height: `${presentHeightPct * 2.2}px` }}
                      className="w-full bg-[#00c676] flex items-center justify-center text-white text-[11px] font-bold transition-all duration-500 hover:bg-[#00b26a]"
                      title={`Present: ${item.present}`}
                    >
                      {item.present}
                    </div>
                  </div>

                  {/* Day and Date Labels */}
                  <div className="mt-3 text-center">
                    <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                      {item.day}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                      {item.date}
                    </p>
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
          </div>
        </div>
      </div>

      {/* Footer within card */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-700">AIoT Smart Classroom</span>
            <span className="hidden sm:inline text-slate-400 mx-1.5">•</span>
            <span className="hidden sm:inline">Real-Time Attendance & Communication System</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last updated: {data.lastUpdated}</span>
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
 * Main AttendanceOverview Container.
 * Supports:
 * - 2 Sections (Section A: 60 students, Section B: 60 students)
 * - Motion effects when admin touches / clicks a specific section
 * - Seamless toggle between Section A, Section B, or Side-by-Side compare
 */
export default function AttendanceOverview() {
  const [activeSection, setActiveSection] = useState('A')
  const [viewMode, setViewMode] = useState('single') // 'single' or 'both'
  const [touchMotion, setTouchMotion] = useState(false)

  const handleSectionTouch = (secId) => {
    setActiveSection(secId)
    // Trigger smooth tactile motion feedback
    setTouchMotion(true)
    setTimeout(() => setTouchMotion(false), 600)
  }

  return (
    <div className="space-y-4">
      {/* Top Interactive Section Touch Selector Bar with Motion Effects */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: 2 Section Touch Cards */}
        <div className="flex items-center gap-3 flex-1">
          {/* Touch Card 1: Section A */}
          <button
            onClick={() => handleSectionTouch('A')}
            className={`flex-1 p-3.5 rounded-2xl border text-left transition-all duration-300 transform-gpu cursor-pointer relative overflow-hidden group ${
              activeSection === 'A'
                ? 'bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 border-blue-500 ring-4 ring-blue-500/15 shadow-md scale-[1.02] -translate-y-0.5'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 hover:scale-[1.01]'
            } ${touchMotion && activeSection === 'A' ? 'animate-bounce' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  activeSection === 'A' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Section A
              </span>
              <span className="text-[11px] font-bold text-emerald-600">80% Present</span>
            </div>
            <p className="text-xs font-extrabold text-slate-800 truncate">
              AI&DS Year 1 — Section A
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              60 Students • Classroom AIDS-1A
            </p>
            {activeSection === 'A' && (
              <span className="absolute bottom-0 inset-x-0 h-1 bg-blue-600 rounded-b-2xl" />
            )}
          </button>

          {/* Touch Card 2: Section B */}
          <button
            onClick={() => handleSectionTouch('B')}
            className={`flex-1 p-3.5 rounded-2xl border text-left transition-all duration-300 transform-gpu cursor-pointer relative overflow-hidden group ${
              activeSection === 'B'
                ? 'bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/60 border-purple-500 ring-4 ring-purple-500/15 shadow-md scale-[1.02] -translate-y-0.5'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300 hover:scale-[1.01]'
            } ${touchMotion && activeSection === 'B' ? 'animate-bounce' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  activeSection === 'B' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Section B
              </span>
              <span className="text-[11px] font-bold text-emerald-600">87% Present</span>
            </div>
            <p className="text-xs font-extrabold text-slate-800 truncate">
              AI&DS Year 1 — Section B
            </p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              60 Students • Classroom AIDS-1B
            </p>
            {activeSection === 'B' && (
              <span className="absolute bottom-0 inset-x-0 h-1 bg-purple-600 rounded-b-2xl" />
            )}
          </button>
        </div>

        {/* Right: View Mode Switcher */}
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
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              viewMode === 'both'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compare Both Sections</span>
          </button>
        </div>
      </div>

      {/* Render Section Overview Card(s) with smooth motion transitions */}
      {viewMode === 'single' ? (
        <div className="transition-all duration-500 ease-out transform">
          {activeSection === 'A' ? (
            <SectionOverviewCard
              data={SECTION_A_DATA}
              isHighlighted={true}
              onTouch={() => handleSectionTouch('A')}
            />
          ) : (
            <SectionOverviewCard
              data={SECTION_B_DATA}
              isHighlighted={true}
              onTouch={() => handleSectionTouch('B')}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all duration-500 ease-out">
          <SectionOverviewCard
            data={SECTION_A_DATA}
            isHighlighted={activeSection === 'A'}
            onTouch={() => handleSectionTouch('A')}
          />
          <SectionOverviewCard
            data={SECTION_B_DATA}
            isHighlighted={activeSection === 'B'}
            onTouch={() => handleSectionTouch('B')}
          />
        </div>
      )}
    </div>
  )
}
