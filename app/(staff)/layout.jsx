"use client"

import ProtectedRoute from '@/components/ProtectedRoute'
import StaffLayout from '@/components/StaffLayout'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'

function StaffGuard({ children }) {
  const router = useRouter()
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth()

  useEffect(() => {
    if (authChecked && !isLoadingAuth && !isAuthenticated) {
      router.push('/login')
    }
  }, [authChecked, isLoadingAuth, isAuthenticated, router])

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f5]">
        <div className="w-8 h-8 border-4 border-[#e6dfd8] border-t-[#cc785c] rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <StaffLayout>{children}</StaffLayout>
}

export default function StaffRouteLayout({ children }) {
  return <StaffGuard>{children}</StaffGuard>
}
