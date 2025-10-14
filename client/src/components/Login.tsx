import { supabase } from '../lib/supabase';

export function Login() {
  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:5173/auth/callback',
          skipBrowserRedirect: false
        }
      });

      if (error) {
        return;
      }

      // The redirect will happen automatically
    } catch (error) {
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Welcome to GoBusker</h1>
      <button 
        onClick={handleGoogleLogin}
        style={{
          display: 'block',
          width: '100%',
          padding: '12px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}