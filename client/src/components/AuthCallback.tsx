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
        // Try to exchange the code for a session
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) throw error;
          
          if (data.session) {
            navigate('/dashboard');
            return;
          }
        }

        // If no code or exchange failed, check current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          navigate('/dashboard');
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