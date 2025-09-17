'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signUp, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await signUp(email, password, firstName, lastName)
    
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else if (data.user) {
      setSuccess('Account created successfully! Please check your email to verify your account.')
      setLoading(false)
      // Optionally redirect to login after a delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-4xl font-bold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-lg text-slate-300">
            Join GeoLeads and start managing your leads
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-8 space-y-6 hover:border-white/20 transition-all duration-300">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white mb-3">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-4 bg-white/10 border border-white/20 placeholder-slate-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                  placeholder="First name"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white mb-3">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-4 bg-white/10 border border-white/20 placeholder-slate-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-3">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-4 bg-white/10 border border-white/20 placeholder-slate-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-3">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-4 bg-white/10 border border-white/20 placeholder-slate-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-3">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-4 bg-white/10 border border-white/20 placeholder-slate-400 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
                placeholder="Confirm your password"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-xl text-white bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-2xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Creating account...
                  </div>
                ) : (
                  <>
                    <span>Create account</span>
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-slate-300">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-purple-300 hover:text-purple-200 transition-colors duration-200 underline decoration-2 underline-offset-2">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
