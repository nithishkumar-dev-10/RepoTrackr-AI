import { Outlet } from 'react-router-dom'

import { Navbar } from '@/components/Navbar'

/** Shell for authenticated pages: persistent navbar + routed content. */
export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
