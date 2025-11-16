import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ isDarkMode, onToggleDarkMode }: HeaderProps) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-100 border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-700 shadow-lg' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-5 flex justify-between items-center h-16">
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className={`text-2xl font-bold cursor-pointer flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-primary'}`}
        >
          <span className="text-3xl">🎵</span>
          GoBusker
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-5">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`rounded-full px-3 py-2 text-lg flex items-center transition-colors duration-300 ${isDarkMode ? 'bg-accent text-white' : 'bg-gray-100 text-gray-800'}`}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          {/* Navigation Links */}
          <nav className="flex gap-5 items-center">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white hover:text-accent' : 'text-gray-700 hover:text-accent'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className={`font-medium transition-colors duration-300 ${isDarkMode ? 'text-white hover:text-accent' : 'text-gray-700 hover:text-accent'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 hover:bg-accent"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
