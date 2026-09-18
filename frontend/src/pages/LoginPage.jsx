import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  BookOpen,
  Users,
  BarChart3,
  Lightbulb,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  Cpu,
  Award,
  Sparkles
} from 'lucide-react'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eaf3ff] flex flex-col justify-between p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background Curved Graphic Accents */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-bl from-blue-300/30 via-sky-200/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-400/20 via-sky-300/10 to-transparent rounded-full blur-3xl pointer-events-none -ml-40 -mb-40" />
      
      {/* Curved SVG Swoop in background */}
      <svg className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1440 900" fill="none">
        <path d="M700 -50 C 950 150, 1100 450, 1500 950" stroke="#a0c8ff" strokeWidth="200" strokeLinecap="round" />
      </svg>

      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-7xl mx-auto w-full z-10">
        <div className="flex items-center gap-3">
          {/* Exact Logo Graphic Crop */}
          <img
            src="/vit-full-logo.png"
            alt="Velammal Institute of Technology"
            className="h-10 md:h-12 object-contain"
          />
        </div>

        <div className="hidden md:flex flex-col items-end">
          <p className="text-xs font-semibold text-slate-600">
            Empowering Minds for a Smarter Tomorrow
          </p>
          <div className="w-12 h-0.5 bg-blue-500 rounded-full mt-1" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-4 sm:my-6 z-10">
        {/* Left Side — Branding & Features */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <div className="relative">
            {/* Stacked Cursive Accent Text matching reference image */}
            <div className="absolute -top-10 left-[210px] sm:left-[270px] pointer-events-none select-none rotate-[-8deg] flex flex-col font-['Caveat',cursive] text-2xl sm:text-3xl font-bold text-blue-500 leading-tight">
              <span>Shape</span>
              <span className="ml-3">Innovate</span>
              <span className="ml-6">Lead</span>
            </div>

            <p className="text-xl text-slate-700 font-semibold mb-1">Welcome to</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0a2540] tracking-tight leading-none">
              VIT <span className="text-[#0066ff]">AI&DS</span> Portal
            </h2>
            <p className="text-slate-600 font-medium mt-3 tracking-wide text-base sm:text-lg">
              Learn &nbsp;•&nbsp; Collaborate &nbsp;•&nbsp; Innovate &nbsp;•&nbsp; Grow
            </p>
          </div>

          {/* 4 Feature Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100/90 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-700 leading-tight">
                Access Resources
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-100/90 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-700 leading-tight">
                Connect with Peers
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-700 leading-tight">
                Track Progress
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex flex-col items-center text-center group hover:bg-white hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/90 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Lightbulb className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-700 leading-tight">
                Explore Opportunities
              </span>
            </div>
          </div>

          {/* Clean Campus Showcase Banner */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border-2 border-white bg-slate-900 group max-h-[210px]">
            <img
              src="/vit-campus-building.png"
              alt="Velammal Institute of Technology Campus"
              className="w-full h-52 object-cover object-center opacity-95 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Overlapping Bottom Slogan Badge */}
            <div className="absolute bottom-0 left-0 bg-gradient-to-r from-[#0a2540]/95 via-[#0a2540]/90 to-[#123661]/85 backdrop-blur-md text-white p-4 pr-8 rounded-tr-3xl max-w-md border-t border-r border-white/20">
              <p className="text-xs sm:text-sm font-serif italic text-blue-100 leading-snug">
                “A future shaped by Intelligence, Driven by Purpose.”
              </p>
              <p className="text-[10px] text-blue-300 font-sans tracking-wider mt-1.5 uppercase font-semibold">
                Velammal Institute of Technology
              </p>
            </div>
          </div>

          {/* Bottom Feature Pills */}
          <div className="hidden sm:flex flex-wrap items-center justify-between bg-white/75 backdrop-blur-md rounded-2xl px-6 py-3 border border-white shadow-sm text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>AI for Real Problems</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Student Community</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Innovation and Research</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Career Readiness</span>
            </div>
          </div>
        </div>

        {/* Right Side — Sign In Box */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative">
            {/* Top Right Portal Badge */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Sign In
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Access your VIT AI&DS portal
                </p>
              </div>
              <div className="bg-[#eef5ff] text-[#0066ff] text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-blue-100 shadow-sm">
                <GraduationCap className="w-4 h-4 text-[#0066ff]" />
                <span>AI & DS Portal</span>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username / Register Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your register number"
                    className="w-full pl-10 pr-4 py-3 bg-[#edf4fc] border border-transparent focus:border-blue-400 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-[#edf4fc] border border-transparent focus:border-blue-400 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Please contact your department coordinator to reset your password.')
                  }}
                  className="text-xs font-bold text-[#0066ff] hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-[#1d6bf3] hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{submitting ? 'Signing in...' : 'Sign in'}</span>
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>

              {/* Footer text in card */}
              <p className="text-center text-xs text-slate-500 pt-3 font-medium">
                New to the portal?{' '}
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault()
                    alert('Contact AI&DS Department Office for account creation.')
                  }}
                  className="font-bold text-[#0066ff] hover:underline"
                >
                  Contact Department
                </a>
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Line */}
      <footer className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-end text-xs text-slate-500 z-10 pt-2 border-t border-slate-200/50">
        <div className="flex items-center gap-2">
          <span>Learn Today</span>
          <span>|</span>
          <span>Build Tomorrow</span>
          <span>|</span>
          <span className="font-semibold text-slate-700">Make an Impact</span>
          <div className="w-6 h-0.5 bg-blue-500 rounded-full ml-1" />
        </div>
      </footer>
    </div>
  )
}