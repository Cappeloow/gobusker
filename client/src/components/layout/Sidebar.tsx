import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { profileService } from '../../services/profileService';
import { AuthModal } from '../AuthModal';
import { 
  Search, 
  Calendar, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Plus,
  User
} from 'lucide-react';
import type { Profile } from '../../types/models';

interface SidebarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Sidebar({ isDarkMode, onToggleDarkMode }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('gobusker-sidebar-expanded');
    return saved ? JSON.parse(saved) : true;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('gobusker-sidebar-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        fetchProfiles();
      } else {
        setProfiles([]);
        setActiveProfile(null);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        fetchProfiles();
      } else {
        setProfiles([]);
        setActiveProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfiles = async () => {
    try {
      const userProfiles = await profileService.getCurrentUserProfiles();
      setProfiles(userProfiles || []);
      
      // Restore active profile from localStorage or use first profile
      const savedActiveId = localStorage.getItem('gobusker-active-profile');
      const savedProfile = userProfiles?.find((p: Profile) => p.id === savedActiveId);
      if (savedProfile) {
        setActiveProfile(savedProfile);
      } else if (userProfiles && userProfiles.length > 0) {
        setActiveProfile(userProfiles[0]);
        localStorage.setItem('gobusker-active-profile', userProfiles[0].id);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSelectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem('gobusker-active-profile', profile.id);
    setProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gobusker-active-profile');
    navigate('/');
  };

  return (
    <>
      <aside 
        className={`
          hidden md:flex flex-col
          fixed left-0 top-0 h-screen z-40
          bg-light-card dark:bg-github-card
          border-r border-light-border dark:border-github-border
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-56' : 'w-16'}
        `}
      >
        {/* Logo */}
        <div 
          className={`
            flex items-center h-14 px-3 cursor-pointer
            border-b border-light-border dark:border-github-border
            ${isExpanded ? 'justify-start gap-2' : 'justify-center'}
          `}
          onClick={() => navigate('/')}
        >
          {isExpanded ? (
            <span 
              className="text-lg font-bold"
              style={{ fontFamily: '"Tan Pearl", serif', color: '#D2B48C', letterSpacing:'3px' }}
            >
              BUSKER
            </span>
          ) : (
            <span 
              className="text-2xl font-bold transition-all duration-300 hover:scale-110"
              style={{ 
                fontFamily: '"Tan Pearl", serif', 
                color: '#D2B48C', 
                textShadow: '1px 1px 2px rgba(210, 180, 140, 0.3)',
                letterSpacing: '1px'
              }}
            >
              B
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {/* Find Performance - always first */}
          <button
            onClick={() => navigate('/')}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm
              transition-all duration-200 mb-0.5
              ${isExpanded ? 'justify-start' : 'justify-center'}
              ${location.pathname === '/'
                ? 'bg-light-blue/10 dark:bg-github-blue/10 text-light-blue dark:text-github-blue font-semibold hover:bg-light-blue/20 dark:hover:bg-github-blue/20'
                : 'text-light-text-secondary dark:text-github-text-secondary hover:bg-light-bg dark:hover:bg-github-bg hover:text-light-text dark:hover:text-github-text'
              }
            `}
            title={!isExpanded ? 'Find Performance' : undefined}
          >
            <Search size={20} />
            {isExpanded && <span>Find Performance</span>}
          </button>
          
          <div className="my-2 border-t border-light-border dark:border-github-border" />

          {/* Profile Selector - Only when logged in */}
          {isLoggedIn && profiles.length > 0 && (
            <div ref={profileDropdownRef} className="relative mb-1">
              <div
                className={`
                  w-full flex items-center gap-2 px-2.5 py-2 rounded-lg
                  bg-light-bg dark:bg-github-bg
                  transition-all duration-200 overflow-hidden
                  ${isExpanded ? 'justify-start' : 'justify-center'}
                `}
              >
                {/* Avatar - clicks to profile page */}
                <div
                  onClick={() => activeProfile && navigate(`/profile/${activeProfile.id}`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  title={!isExpanded ? 'View Profile' : undefined}
                >
                  {activeProfile?.avatar_url ? (
                    <img 
                      src={activeProfile.avatar_url} 
                      alt={activeProfile.name} 
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-light-blue dark:bg-github-blue flex items-center justify-center text-white text-[10px] font-semibold">
                      {activeProfile?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex-1 flex items-center gap-1 text-left hover:bg-light-border/30 dark:hover:bg-github-border/30 rounded px-1 py-0.5 transition-colors min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-light-text dark:text-github-text truncate">
                        {activeProfile?.name || 'Select Profile'}
                      </div>
                      <div className="text-[10px] text-light-text-muted dark:text-github-text-muted capitalize">
                        {activeProfile?.role || 'No profile'}
                      </div>
                    </div>
                    <ChevronDown 
                      size={12} 
                      className={`text-light-text-muted dark:text-github-text-muted flex-shrink-0 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                )}
              </div>

              {/* Dropdown Menu - opens downward */}
              {profileDropdownOpen && (
                <div className={`
                  absolute top-full mt-1 bg-light-card dark:bg-github-card
                  border border-light-border dark:border-github-border
                  rounded-lg shadow-xl z-50 overflow-hidden
                  ${isExpanded ? 'left-0 right-0' : 'left-0 w-48'}
                `}>
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelectProfile(profile)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 text-left
                        hover:bg-light-bg dark:hover:bg-github-bg transition-colors
                        ${activeProfile?.id === profile.id ? 'bg-light-blue/10 dark:bg-github-blue/10' : ''}
                      `}
                    >
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.name} 
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-light-blue dark:bg-github-blue flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                          {profile.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-light-text dark:text-github-text truncate">
                          {profile.name}
                        </div>
                        <div className="text-[10px] text-light-text-muted dark:text-github-text-muted capitalize">
                          {profile.role}
                        </div>
                      </div>
                      {activeProfile?.id === profile.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-light-blue dark:bg-github-blue flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-light-border dark:border-github-border">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/create-profile');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-light-bg dark:hover:bg-github-bg transition-colors"
                    >
                      <Plus size={16} className="text-light-text-muted dark:text-github-text-muted" />
                      <span className="text-xs text-light-text-secondary dark:text-github-text-secondary">Add Profile</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dashboard & Create Event - auth required */}
          {isLoggedIn && (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm
                  transition-all duration-200 mb-0.5
                  ${isExpanded ? 'justify-start' : 'justify-center'}
                  ${location.pathname === '/dashboard'
                    ? 'bg-light-blue/10 dark:bg-github-blue/10 text-light-blue dark:text-github-blue font-semibold hover:bg-light-blue/20 dark:hover:bg-github-blue/20'
                    : 'text-light-text-secondary dark:text-github-text-secondary hover:bg-light-bg dark:hover:bg-github-bg hover:text-light-text dark:hover:text-github-text'
                  }
                `}
                title={!isExpanded ? 'Dashboard' : undefined}
              >
                <LayoutDashboard size={20} />
                {isExpanded && <span>Dashboard</span>}
              </button>

              <button
                onClick={() => {
                  if (activeProfile) {
                    navigate(`/create-event?profile=${activeProfile.id}`);
                  } else {
                    navigate('/create-event');
                  }
                }}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm
                  transition-all duration-200 mb-0.5
                  ${isExpanded ? 'justify-start' : 'justify-center'}
                  ${location.pathname === '/create-event'
                    ? 'bg-light-blue/10 dark:bg-github-blue/10 text-light-blue dark:text-github-blue font-semibold hover:bg-light-blue/20 dark:hover:bg-github-blue/20'
                    : 'text-light-text-secondary dark:text-github-text-secondary hover:bg-light-bg dark:hover:bg-github-bg hover:text-light-text dark:hover:text-github-text'
                  }
                `}
                title={!isExpanded ? 'Create Event' : undefined}
              >
                <Calendar size={20} />
                {isExpanded && <span>Create Event</span>}
              </button>
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t border-light-border dark:border-github-border">
          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm mb-1
              text-light-text-secondary dark:text-github-text-secondary
              hover:bg-light-bg dark:hover:bg-github-bg
              transition-all duration-200
              ${isExpanded ? 'justify-start' : 'justify-center'}
            `}
            title={!isExpanded ? (isDarkMode ? 'Light mode' : 'Dark mode') : undefined}
          >
            <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
            {isExpanded && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* Login/Logout */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                text-red-500 dark:text-red-400
                hover:bg-red-100 dark:hover:bg-red-900/20
                transition-all duration-200
                ${isExpanded ? 'justify-start' : 'justify-center'}
              `}
              title={!isExpanded ? 'Logout' : undefined}
            >
              <LogOut size={20} />
              {isExpanded && <span>Logout</span>}
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                bg-light-blue dark:bg-github-blue text-white
                hover:bg-light-blue-dark dark:hover:bg-github-blue-dark
                transition-all duration-200
                ${isExpanded ? 'justify-start' : 'justify-center'}
              `}
              title={!isExpanded ? 'Sign In' : undefined}
            >
              <User size={20} />
              {isExpanded && <span>Sign In</span>}
            </button>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-lg text-sm
              text-light-text-muted dark:text-github-text-muted
              hover:bg-light-bg dark:hover:bg-github-bg
              transition-all duration-200
              ${isExpanded ? 'justify-start' : 'justify-center'}
            `}
            title={!isExpanded ? 'Expand' : 'Collapse'}
          >
            {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            {isExpanded && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
      />
    </>
  );
}
