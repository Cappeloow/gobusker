import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';
import { profileService } from '../services/profileService';
import { Wallet } from './Wallet';
import { Mail } from 'lucide-react';

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-light-text dark:text-github-text mb-2">Your Dashboard</h1>
          <p className="text-light-text-secondary dark:text-github-text-secondary">Logged in as: <span className="text-light-blue dark:text-github-blue">{userEmail}</span></p>
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
                        className="p-6 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg cursor-pointer transition-all duration-300 hover:border-light-blue dark:hover:border-github-blue hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {profile.avatar_url && (
                              <img 
                                src={profile.avatar_url} 
                                alt={`${profile.name}'s avatar`}
                                className="w-16 h-16 rounded-full object-cover border-2 border-light-border dark:border-github-border"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-light-text dark:text-github-text">{profile.name}</h3>
                                <span className="text-sm px-3 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary capitalize">
                                  {profile.role}
                                </span>
                              </div>
                            {profile.bio && <p className="text-light-text-secondary dark:text-github-text-secondary mb-3">{profile.bio}</p>}
                            {profile.genres && profile.genres.length > 0 && (
                              <p className="text-sm text-light-text-muted dark:text-github-text-muted">
                                <span className="text-light-text-secondary dark:text-github-text-secondary">Genres:</span> {profile.genres.join(', ')}
                              </p>
                            )}
                            {profile.instruments && profile.instruments.length > 0 && (
                              <p className="text-sm text-light-text-muted dark:text-github-text-muted">
                                <span className="text-light-text-secondary dark:text-github-text-secondary">Instruments:</span> {profile.instruments.join(', ')}
                              </p>
                            )}
                            </div>
                          </div>
                          <span className="text-2xl ml-4">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate('/create-profile')}
                      className="px-6 py-3 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <span>+</span>
                      Create Another Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Wallet userProfiles={userProfiles} />
          )}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-light-border dark:border-github-border">
          <button
            onClick={() => navigate('/create-profile')}
            className="px-6 py-2 text-light-blue dark:text-github-blue hover:text-light-text dark:hover:text-github-text font-medium transition-colors duration-200"
          >
            ← Back
          </button>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/40 rounded-lg font-medium transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}