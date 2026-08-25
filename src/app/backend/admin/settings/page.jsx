'use client';
import { Suspense } from 'react'
import SettingsPage from '../SettingsPage';

export default function DashboardDemoSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  )
}
