import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { GoogleIcon } from './GoogleIcon';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        setError(error.message);
        return;
      }
      // The redirect will happen automatically
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Success - close modal
      onClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Check if email confirmation is required
      setSuccess('Account created! Please check your email to confirm your account.');
      
      // Optionally auto-login after signup (if email confirmation is disabled)
      // If signup was successful and no email confirmation required, close modal
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-light-card dark:bg-github-card rounded-2xl shadow-2xl border border-light-border dark:border-github-border overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-light-text-muted dark:text-github-text-muted hover:text-light-text dark:hover:text-github-text transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4 text-center">
          <div className="text-4xl mb-3">🎵</div>
          <h2 className="text-2xl font-bold text-light-text dark:text-github-text">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mt-1">
            {mode === 'login' 
              ? 'Sign in to continue to GoBusker' 
              : 'Join GoBusker and start discovering live music'}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm">
              {success}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg hover:bg-light-bg dark:hover:bg-github-card transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            <span className="font-medium text-light-text dark:text-github-text">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-light-border dark:bg-github-border" />
            <span className="text-sm text-light-text-muted dark:text-github-text-muted">or</span>
            <div className="flex-1 h-px bg-light-border dark:bg-github-border" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={mode === 'login' ? handleEmailLogin : handleRegister}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-github-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted focus:outline-none focus:ring-2 focus:ring-light-blue dark:focus:ring-github-blue focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-github-text-secondary mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted focus:outline-none focus:ring-2 focus:ring-light-blue dark:focus:ring-github-blue focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-github-text-secondary mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted focus:outline-none focus:ring-2 focus:ring-light-blue dark:focus:ring-github-blue focus:border-transparent transition-all"
                    disabled={loading}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Mode Switch */}
          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-light-text-secondary dark:text-github-text-secondary">
                Don't have an account?{' '}
                <button
                  onClick={() => handleModeSwitch('register')}
                  className="text-light-blue dark:text-github-blue hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-light-text-secondary dark:text-github-text-secondary">
                Already have an account?{' '}
                <button
                  onClick={() => handleModeSwitch('login')}
                  className="text-light-blue dark:text-github-blue hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
