import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { computeUserIdentifierHash } from '../utils/didUtils';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Supabase Authentication Service
 * Handles login with different authentication methods and user information retrieval
 */
export class SupabaseAuthService {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Sign in with GitHub OAuth
   */
  async signInWithGithub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Sign in with email and OTP (One-Time Password)
   * @param email User's email address
   */
  async signInWithEmailOTP(email: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Handle authentication callback
   */
  async handleAuthCallback() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Get user identifier hash
   * Used for privacy protection when creating an Agent DID
   */
  async getUserIdentifierHash() {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not logged in');
    
    const provider = user.app_metadata.provider || 'email';
    const identifier = user.email || user.id;
    
    return computeUserIdentifierHash(provider, identifier);
  }

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
} 