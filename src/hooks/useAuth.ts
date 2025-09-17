'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase'

export interface AuthUser extends User {
  profile?: {
    id: string
    first_name: string
    last_name: string
    email: string
    photo_url?: string
    role?: 'admin' | 'user'
    created_at: string
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user)
        }
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (authUser: User) => {
    try {
      // Use the latest user metadata from Supabase
      const userWithProfile: AuthUser = {
        ...authUser,
        profile: {
          id: authUser.id,
          first_name: authUser.user_metadata?.first_name || 'User',
          last_name: authUser.user_metadata?.last_name || '',
          email: authUser.email || '',
          photo_url: authUser.user_metadata?.avatar_url,
          role: authUser.user_metadata?.role || 'user',
          created_at: authUser.created_at
        }
      }

      setUser(userWithProfile)
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'user' // New users are 'user' role by default
        }
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setSession(null)
    }
    return { error }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut
  }
}
