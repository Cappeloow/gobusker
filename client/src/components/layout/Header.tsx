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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-light-card dark:bg-github-card border-b border-light-border dark:border-github-border shadow-lg h-14 md:h-16">
      <div className="w-full h-full px-4 md:px-5 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className="text-xl md:text-2xl font-bold cursor-pointer flex items-center gap-2 text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue"
        >
          <span className="text-2xl md:text-3xl">🎵</span>
          <span className="hidden sm:inline">Busker</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-5">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="rounded-full px-3 py-2 text-lg flex items-center bg-light-bg dark:bg-github-bg hover:bg-light-border dark:hover:bg-github-border text-light-text-secondary dark:text-github-text-secondary transition-colors duration-300"
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
                  className="font-medium text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue transition-colors duration-300"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue transition-colors duration-300"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Mobile: Dark mode + Hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-lg"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-light-text dark:text-github-text"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-light-card dark:bg-github-card border-t border-light-border dark:border-github-border px-4 py-3">
          <nav className="flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 font-medium text-red-600 dark:text-red-400"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
                >
                  🔑 Login
                </button>
                <button
                  onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                  className="w-full py-2 bg-light-blue dark:bg-github-blue text-white rounded-lg font-medium text-center"
                >
                  Sign Up
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
