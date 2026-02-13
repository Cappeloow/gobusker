import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthState = async () => {
      try {
        // Get the current URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        // Get the redirect location from localStorage
        const redirectTo = localStorage.getItem('redirectAfterAuth') || '/dashboard';
        localStorage.removeItem('redirectAfterAuth'); // Clean up
        
        // Try to exchange the code for a session
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;
          
          if (data.session) {
            navigate(redirectTo);
            return;
          }
        }

        // If no code or exchange failed, check current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          navigate(redirectTo);
        } else {
          navigate('/');
        }
      } catch (error) {
        navigate('/');
      }
    };

    handleAuthState();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-tan-pearl to-sage-green flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tan-dark mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-tan-dark mb-2">Signing you in...</h2>
          <p className="text-tan-darker">Please wait while we process your authentication.</p>
        </div>
      </div>
    </div>
  );
}