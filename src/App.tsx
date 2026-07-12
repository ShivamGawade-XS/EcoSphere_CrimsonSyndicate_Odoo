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
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { FeatureErrorBoundary } from '@/components/shared/FeatureErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
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
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
