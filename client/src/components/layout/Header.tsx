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
    <header className="sticky top-0 z-100 w-full bg-github-card border-b border-github-border shadow-lg">
      <div className="w-full px-5 flex justify-between items-center h-16">
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className="text-2xl font-bold cursor-pointer flex items-center gap-2 text-github-text hover:text-github-blue transition-colors duration-300"
        >
          <span className="text-3xl">🎵</span>
          Busker
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-5">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="rounded-full px-3 py-2 text-lg flex items-center bg-github-bg hover:bg-github-border text-github-text-secondary transition-colors duration-300"
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
                  className="font-medium text-github-text hover:text-github-blue transition-colors duration-300"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-900/20 border border-red-700 text-red-300 hover:bg-red-900/40 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-github-text hover:text-github-blue transition-colors duration-300"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-github-blue hover:bg-github-blue-dark text-github-text px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
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
