import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';
import { profileService } from '../services/profileService';
import { OrderHistory } from './OrderHistory';

export function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profiles' | 'orders'>('profiles');

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
    <div className="p-5">
      <div className="max-w-4xl mx-auto p-5 bg-white dark:bg-secondary rounded-lg shadow-md dark:shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Your Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Logged in as: {userEmail}</p>
        
        {/* Tab Navigation */}
        <div className="mt-7 mb-5 flex gap-2 border-b-2 border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-5 py-3 rounded-t-md font-bold transition-colors duration-300 ${
              activeTab === 'profiles'
                ? 'bg-primary text-white'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-accent'
            }`}
          >
            Your Profiles
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3 rounded-t-md font-bold transition-colors duration-300 ${
              activeTab === 'orders'
                ? 'bg-primary text-white'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-accent'
            }`}
          >
            Order History
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-5">
          {activeTab === 'profiles' ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Profiles</h2>
              {userProfiles.length === 0 ? (
                <div className="text-center mt-5">
                  <p className="text-gray-600 dark:text-gray-300 mb-3">You haven't created any profiles yet.</p>
                  <button
                    onClick={() => navigate('/create-profile')}
                    className="px-6 py-3 bg-primary text-white rounded-md hover:bg-accent transition-colors duration-300 font-medium text-base"
                  >
                    Create Your First Profile
                  </button>
                </div>
              ) : (
                <div>
                  {userProfiles.map(profile => (
                    <div 
                      key={profile.id}
                      onClick={() => navigate(`/profile/${profile.id}`)}
                      className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md mb-3 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-xl"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{profile.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{profile.profile_type === 'band' ? '🎸 Band' : '🎵 Artist'}</p>
                      {profile.bio && <p className="text-gray-600 dark:text-gray-300 mt-1">{profile.bio}</p>}
                      {profile.genres && profile.genres.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {profile.genres.join(' • ')}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => navigate('/create-profile')}
                      className="px-6 py-3 bg-primary text-white rounded-md hover:bg-accent transition-colors duration-300 font-medium text-base flex items-center gap-2"
                    >
                      <span>👤</span>
                      Create Another Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <OrderHistory />
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-300 mt-5 font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}