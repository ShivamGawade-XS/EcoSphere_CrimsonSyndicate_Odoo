import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EnvironmentalDashboard } from '@/features/environmental/pages/EnvironmentalDashboard'
import { SocialDashboard } from '@/features/social/pages/SocialDashboard'
import { GovernanceDashboard } from '@/features/governance/pages/GovernanceDashboard'
import { GamificationDashboard } from '@/features/gamification/pages/GamificationDashboard'
import { MissionControl } from '@/features/mission-control/MissionControl'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { FeatureErrorBoundary } from '@/components/shared/FeatureErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated app — /app/* */}
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard"          element={<DashboardPage />} />
            <Route path="environmental/*"    element={
              <FeatureErrorBoundary featureName="Environmental tracking">
                <EnvironmentalDashboard />
              </FeatureErrorBoundary>
            } />
            <Route path="social/*"           element={
              <FeatureErrorBoundary featureName="Social & CSR">
                <SocialDashboard />
              </FeatureErrorBoundary>
            } />
            <Route path="governance/*"       element={
              <FeatureErrorBoundary featureName="Governance">
                <GovernanceDashboard />
              </FeatureErrorBoundary>
            } />
            <Route path="gamification/*"     element={
              <FeatureErrorBoundary featureName="Gamification">
                <GamificationDashboard />
              </FeatureErrorBoundary>
            } />
            <Route path="mission-control"    element={
              <FeatureErrorBoundary featureName="Mission Control">
                <MissionControl />
              </FeatureErrorBoundary>
            } />
            <Route path="reports/*"          element={
              <FeatureErrorBoundary featureName="Reports">
                <ReportsPage />
              </FeatureErrorBoundary>
            } />
            <Route path="settings/*"         element={<SettingsPage />} />
            <Route path="*"                  element={<NotFoundPage />} />
          </Route>

          {/* Legacy redirects — old /dashboard links still work */}
          <Route path="/dashboard"        element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/environmental/*"  element={<Navigate to="/app/environmental" replace />} />
          <Route path="/social/*"         element={<Navigate to="/app/social" replace />} />
          <Route path="/governance/*"     element={<Navigate to="/app/governance" replace />} />
          <Route path="/gamification/*"   element={<Navigate to="/app/gamification" replace />} />
          <Route path="/mission-control"  element={<Navigate to="/app/mission-control" replace />} />
          <Route path="/reports/*"        element={<Navigate to="/app/reports" replace />} />
          <Route path="/settings/*"       element={<Navigate to="/app/settings" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
