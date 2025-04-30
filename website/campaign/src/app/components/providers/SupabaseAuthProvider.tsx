// filepath: /workspaces/nuwa/website/campaign/src/app/components/providers/SupabaseAuthProvider.tsx
'use client'

import { createClientComponentClient } from '@/app/services/supabase'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'

// Define types for our session and user
type User = {
  id: string
  email?: string
  user_metadata: {
    name?: string
    avatar_url?: string
    preferred_username?: string
    user_name?: string
    full_name?: string
    picture?: string
    twitter_handle?: string
  }
}

type Session = {
  user: User | null
  isLoading: boolean
  error: Error | null
}

// Create the auth context
const AuthContext = createContext<{
  session: Session
  signIn: (provider: 'twitter') => Promise<void>
  signOut: () => Promise<void>
}>({
  session: { user: null, isLoading: true, error: null },
  signIn: async () => {},
  signOut: async () => {},
})

// Export a hook to use the auth context
export const useSupabaseAuth = () => useContext(AuthContext)

// Auth Provider component
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    isLoading: true,
    error: null,
  })
  const router = useRouter()
  
  // Use useMemo to create a single instance of the Supabase client
  const supabase = useMemo(() => createClientComponentClient(), [])

  // Fetch session when the component mounts
  useEffect(() => {
    async function getSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          setSession({ user: null, isLoading: false, error })
          return
        }
        
        if (data.session) {
          setSession({ user: data.session.user, isLoading: false, error: null })
        } else {
          setSession({ user: null, isLoading: false, error: null })
        }
      } catch (error) {
        setSession({ user: null, isLoading: false, error: error as Error })
      }
    }

    getSession()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setSession({ user: session.user, isLoading: false, error: null })
        } else {
          setSession({ user: null, isLoading: false, error: null })
        }
        
        // Refresh UI to update client-side data
        router.refresh()
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Sign in with provider
  const signIn = async (provider: 'twitter') => {
    try {
      console.log('signIn', provider)
      console.log('window.location.origin', window.location.origin)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('signIn', error)

      if (error) {
        setSession({ ...session, error })
      }
    } catch (error) {
      setSession({ ...session, error: error as Error })
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      setSession({ ...session, error: error as Error })
    }
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}