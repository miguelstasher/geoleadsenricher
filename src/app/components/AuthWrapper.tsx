'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Use window.location to avoid router issues
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login'
      }
    }
  }, [user, loading])

  // Always show login/signup pages immediately
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/signup'))) {
    return <>{children}</>
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, show the app
  if (user) {
    return <>{children}</>
  }

  // If not authenticated and not on auth pages, redirect immediately
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }

  return null
}
