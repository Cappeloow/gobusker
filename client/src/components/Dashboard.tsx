import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';
import { profileService } from '../services/profileService';
import { Wallet } from './Wallet';
import { Mail, Plus } from 'lucide-react';

interface PendingInvite {
  id: string;
  invite_token: string;
  invitee_email: string;
  revenue_share: number;
  expires_at: string;
  profiles: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
  };
  inviter: {
    name?: string;
  };
}

export function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'wallet'>('profiles');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPendingInvites = async () => {
    try {
      console.log('Fetching pending invites...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('No session token');
        return;
      }

      console.log('User email:', session.user?.email);
      const response = await fetch('http://localhost:3000/api/invites/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('Invites response status:', response.status);
      if (response.ok) {
        const invites = await response.json();
        console.log('Fetched invites:', invites);
        setPendingInvites(invites);
      } else {
        console.error('Failed to fetch invites:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching invites:', err);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      // Get the current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        navigate('/');
        return;
      }

      if (!session) {
        navigate('/');
        return;
      }

      setUserEmail(session.user?.email ?? 'User');

      try {
        const profiles = await profileService.getCurrentUserProfiles();
        setUserProfiles(profiles);
        await fetchPendingInvites();
      } catch (err) {
        // If there's an error fetching profiles, we'll just show empty state
        console.error('Error loading profiles:', err);
        setUserProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/');
      } else if (session) {
        setUserEmail(session.user?.email ?? 'User');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
      <div className="max-w-5xl mx-auto bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-light-text dark:text-github-text mb-2">Your Dashboard</h1>
            <p className="text-light-text-secondary dark:text-github-text-secondary">Logged in as: <span className="text-light-blue dark:text-github-blue">{userEmail}</span></p>
          </div>
          {/* Create Profile Button */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="p-3 rounded-lg bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white transition-all duration-200"
              title="Create Profile"
            >
              <Plus size={20} />
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    navigate('/create-profile');
                    setShowCreateMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-light-text dark:text-github-text hover:bg-light-bg dark:hover:bg-github-bg transition-colors flex items-center gap-2"
                >
                  <span>🎵</span>
                  <span>Create New Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Invitations Banner */}
        {pendingInvites.length > 0 && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? 's' : ''}!
              </h2>
            </div>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-light-text dark:text-github-text mb-1">
                        {invite.profiles.name}
                      </h3>
                      <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mb-2">
                        {invite.inviter.name || 'Someone'} invited you to join as a band member
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        💰 Revenue Share: {invite.revenue_share.toFixed(1)}% of tips
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/invite/${invite.invite_token}`)}
                      className="px-4 py-2 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-medium rounded-lg transition-colors"
                    >
                      View Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-light-border dark:border-github-border mb-8">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'profiles'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            Your Profiles
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'wallet'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            💰 Wallet
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'profiles' ? (
            <div>
              {userProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text-secondary dark:text-github-text-secondary mb-6 text-lg">You haven't created any profiles yet.</p>
                  <button
                    onClick={() => navigate('/create-profile')}
                    className="px-6 py-3 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-semibold rounded-lg transition-all duration-200"
                  >
                    Create Your First Profile
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid gap-4 mb-8">
                    {userProfiles.map(profile => (
                      <div 
                        key={profile.id}
                        onClick={() => navigate(`/profile/${profile.id}`)}
                        className="group p-6 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg cursor-pointer transition-all duration-300 hover:border-light-blue dark:hover:border-github-blue hover:shadow-lg hover:scale-[1.01]"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <img 
                              src={profile.avatar_url || 'https://via.placeholder.com/150/2d3748/e2e8f0?text=No+Image'} 
                              alt={`${profile.name}'s avatar`}
                              className="w-20 h-20 rounded-full object-cover border-4 border-light-border dark:border-github-border shadow-lg"
                            />
                          </div>
                          
                          {/* Content - All Left Aligned */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-light-text dark:text-github-text">{profile.name}</h3>
                              <span className="text-xs px-3 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary capitalize">
                                {profile.role === 'busker' ? '🎵 Busker' : profile.role === 'eventmaker' ? '📋 Event Maker' : '👁️ Viewer'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profile.genres && profile.genres.slice(0, 3).map((genre, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-muted dark:text-github-text-muted">
                                  {genre}
                                </span>
                              ))}
                              {profile.genres && profile.genres.length > 3 && (
                                <span className="text-xs px-2 py-1 text-light-text-muted dark:text-github-text-muted">
                                  +{profile.genres.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow */}
                          <div className="flex-shrink-0 text-light-text-secondary dark:text-github-text-secondary group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors">
                            <span className="text-2xl">→</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Wallet userProfiles={userProfiles} />
          )}
        </div>
      </div>
    </div>
  );
}