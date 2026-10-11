import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/AppLayout'
import { GuestRoute, ProtectedRoute } from '@/components/guards'
import Dashboard from '@/pages/Dashboard'
import Developer from '@/pages/Developer'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import RepoWorkspace from '@/pages/RepoWorkspace'
import Signup from '@/pages/Signup'
import VerifyEmail from '@/pages/VerifyEmail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/repo/:id" element={<RepoWorkspace />} />
          <Route path="/developer" element={<Developer />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
