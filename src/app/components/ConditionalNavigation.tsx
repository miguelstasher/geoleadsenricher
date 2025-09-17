'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

interface ConditionalNavigationProps {
  children: React.ReactNode
}

export default function ConditionalNavigation({ children }: ConditionalNavigationProps) {
  const pathname = usePathname()
  
  // Hide navigation on auth pages
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  
  if (isAuthPage) {
    return <>{children}</>
  }
  
  return (
    <>
      <Navigation />
      <main className="container mx-auto p-4">
        {children}
      </main>
    </>
  )
}
