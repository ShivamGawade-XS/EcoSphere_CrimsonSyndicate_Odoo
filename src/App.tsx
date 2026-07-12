import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EnvironmentalDashboard } from '@/features/environmental/pages/EnvironmentalDashboard'
import { SocialDashboard } from '@/features/social/pages/SocialDashboard'
import { GovernanceDashboard } from '@/features/governance/pages/GovernanceDashboard'
import { GamificationDashboard } from '@/features/gamification/pages/GamificationDashboard'
import { MissionControl } from '@/features/mission-control/MissionControl'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"          element={<DashboardPage />} />
          <Route path="environmental/*"    element={<EnvironmentalDashboard />} />
          <Route path="social/*"           element={<SocialDashboard />} />
          <Route path="governance/*"       element={<GovernanceDashboard />} />
          <Route path="gamification/*"     element={<GamificationDashboard />} />
          <Route path="mission-control"    element={<MissionControl />} />
          <Route path="reports/*"          element={<ReportsPage />} />
          <Route path="settings/*"         element={<SettingsPage />} />
          <Route path="*"                  element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
