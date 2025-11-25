import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';
import { profileService } from '../services/profileService';
import { Wallet } from './Wallet';

export function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'wallet'>('profiles');

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
    <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card p-4">
      <div className="max-w-5xl mx-auto bg-github-card border border-github-border rounded-lg p-8 shadow-xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-github-text mb-2">Your Dashboard</h1>
          <p className="text-github-text-secondary">Logged in as: <span className="text-github-blue">{userEmail}</span></p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-github-border mb-8">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'profiles'
                ? 'text-github-blue border-github-blue'
                : 'text-github-text-secondary border-transparent hover:text-github-text'
            }`}
          >
            Your Profiles
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'wallet'
                ? 'text-github-blue border-github-blue'
                : 'text-github-text-secondary border-transparent hover:text-github-text'
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
                  <p className="text-github-text-secondary mb-6 text-lg">You haven't created any profiles yet.</p>
                  <button
                    onClick={() => navigate('/create-profile')}
                    className="px-6 py-3 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200"
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
                        className="p-6 bg-github-bg border border-github-border rounded-lg cursor-pointer transition-all duration-300 hover:border-github-blue hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-github-text">{profile.name}</h3>
                              <span className="text-sm px-3 py-1 bg-github-card border border-github-border rounded-full text-github-text-secondary capitalize">
                                {profile.role}
                              </span>
                            </div>
                            {profile.bio && <p className="text-github-text-secondary mb-3">{profile.bio}</p>}
                            {profile.genres && profile.genres.length > 0 && (
                              <p className="text-sm text-github-text-muted">
                                <span className="text-github-text-secondary">Genres:</span> {profile.genres.join(', ')}
                              </p>
                            )}
                            {profile.instruments && profile.instruments.length > 0 && (
                              <p className="text-sm text-github-text-muted">
                                <span className="text-github-text-secondary">Instruments:</span> {profile.instruments.join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="text-2xl ml-4">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate('/create-profile')}
                      className="px-6 py-3 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200 flex items-center gap-2"
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

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-github-border">
          <button
            onClick={() => navigate('/create-profile')}
            className="px-6 py-2 text-github-blue hover:text-github-text font-medium transition-colors duration-200"
          >
            ← Back
          </button>
          <button
            onClick={handleSignOut}
            className="px-6 py-2 bg-red-900/20 border border-red-700 text-red-300 hover:bg-red-900/40 rounded-lg font-medium transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}