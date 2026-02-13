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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>Processing login...</div>
    </div>
  );
}