import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AuthModal } from '../AuthModal';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ isDarkMode, onToggleDarkMode }: HeaderProps) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
  };

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-light-card dark:bg-github-card border-b border-light-border dark:border-github-border shadow-lg h-14">
      <div className="w-full h-full px-4 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className="text-xl font-bold cursor-pointer flex items-center gap-2 text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue"
        >
          <span style={{ fontFamily: '"Tan Pearl", serif', color: '#D2B48C', letterSpacing:'4px' }}>BUSKER</span>
        </div>

        {/* Mobile: Dark mode + Hamburger */}
        <div className="flex items-center gap-3">
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
        <div className="bg-light-card dark:bg-github-card border-t border-light-border dark:border-github-border px-4 py-3">
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
            >
              🏠 Explore
            </button>
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => { navigate('/create-profile'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
                >
                  👤 Create Profile
                </button>
                <button
                  onClick={() => { navigate('/create-event'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 font-medium text-light-text dark:text-github-text"
                >
                  📅 Create Event
                </button>
                <div className="my-2 border-t border-light-border dark:border-github-border" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left py-2 font-medium text-red-600 dark:text-red-400"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="w-full py-2 bg-light-blue dark:bg-github-blue text-white rounded-lg font-medium text-center"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </header>
  );
}
