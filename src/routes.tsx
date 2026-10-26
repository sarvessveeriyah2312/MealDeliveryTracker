import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RequireAuth } from '@/auth/RequireAuth'
import { LoginPage } from '@/auth/LoginPage'
import { AppLayout } from '@/components/AppLayout'
import { TodayPage } from '@/features/today/TodayPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { SummaryPage } from '@/features/summary/SummaryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <TodayPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'summary', element: <SummaryPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'share', element: <Navigate to="/reports" replace /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
])
