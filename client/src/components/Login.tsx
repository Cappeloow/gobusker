import { supabase } from '../lib/supabase';

export function Login() {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:5173/auth/callback',
          skipBrowserRedirect: false,
          queryParams: {
            prompt: 'select_account'
          }
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
    <div className="max-w-md mx-auto my-10 px-5">
      <h1 className="text-3xl font-bold text-center mb-5 text-gray-900 dark:text-white">Welcome to GoBusker</h1>
      <button 
        onClick={handleGoogleLogin}
        className="w-full py-3 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-300 font-medium text-base"
      >
        Sign in with Google
      </button>
    </div>
  );
}