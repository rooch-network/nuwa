import { useState, useEffect } from 'react';
import { SupabaseAuthService } from '../services/supabaseService';

interface AuthProps {
  onSuccess: (userHash: string) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const authService = new SupabaseAuthService();

  // Check for authentication in URL params (for OAuth redirects)
  useEffect(() => {
    const checkAuthRedirect = async () => {
      try {
        const session = await authService.handleAuthCallback();
        if (session) {
          const userHash = await authService.getUserIdentifierHash();
          onSuccess(userHash);
        }
      } catch (error) {
        console.error('Failed to process authentication callback:', error);
        setMessage('Authentication failed. Please try again later.');
      }
    };

    // Check if the URL contains auth parameters
    if (window.location.href.includes('/auth/callback')) {
      checkAuthRedirect();
    }
  }, [onSuccess]);

  // Handle Google OAuth login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
      // Note: OAuth flow will redirect the user, so no need to call onSuccess here
    } catch (error) {
      console.error('Google login failed:', error);
      setMessage('Google login failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle GitHub OAuth login
  const handleGithubLogin = async () => {
    try {
      setLoading(true);
      await authService.signInWithGithub();
      // Note: OAuth flow will redirect the user, so no need to call onSuccess here
    } catch (error) {
      console.error('GitHub login failed:', error);
      setMessage('GitHub login failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Email OTP login
  const handleEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage('');
      
      if (!email) {
        setMessage('Please enter an email address');
        return;
      }
      
      await authService.signInWithEmailOTP(email);
      setMessage('Verification email sent. Please check your inbox.');
    } catch (error) {
      console.error('Email login failed:', error);
      setMessage('Email login failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Custodian Service</h2>
      <p>Choose a method to login and create your Agent DID</p>
      
      <div className="auth-methods">
        <button 
          className="auth-button google" 
          onClick={handleGoogleLogin} 
          disabled={loading}
        >
          Login with Google
        </button>
        
        <button 
          className="auth-button github" 
          onClick={handleGithubLogin} 
          disabled={loading}
        >
          Login with GitHub
        </button>
        
        <div className="divider">or</div>
        
        <form onSubmit={handleEmailOTP} className="email-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="auth-button email" 
            disabled={loading}
          >
            Login with Email
          </button>
        </form>
      </div>
      
      {message && <div className="message">{message}</div>}
    </div>
  );
} 