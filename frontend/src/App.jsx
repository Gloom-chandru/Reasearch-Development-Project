import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import SessionsPage from './pages/SessionsPage'
import ClassroomsPage from './pages/ClassroomsPage'
import NoticesPage from './pages/NoticesPage'
import UsersPage from './pages/UsersPage'
import ClassroomDisplay from './pages/ClassroomDisplay'
import AnalyticsPage from './pages/AnalyticsPage'
import Layout from './components/Layout'

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          {/* Classroom display — public kiosk page, no auth required */}
          <Route path="/display/:classroomId" element={<ClassroomDisplay />} />

          {/* Protected admin portal */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/classrooms" element={<ClassroomsPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </WebSocketProvider>
    </AuthProvider>
  )
}
