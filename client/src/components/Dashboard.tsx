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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1>Welcome to Your Dashboard</h1>
        <p>Logged in as: {userEmail}</p>
        
        {/* Tab Navigation */}
        <div style={{ marginTop: '30px', marginBottom: '20px', display: 'flex', gap: '10px', borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setActiveTab('profiles')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'profiles' ? '#4285f4' : 'transparent',
              color: activeTab === 'profiles' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Your Profiles
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'orders' ? '#4285f4' : 'transparent',
              color: activeTab === 'orders' ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Order History
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: '20px' }}>
          {activeTab === 'profiles' ? (
            <div>
              <h2>Your Profiles</h2>
              {userProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <p>You haven't created any profiles yet.</p>
                  <button
                    onClick={() => navigate('/create-profile')}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#4285f4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '10px',
                      fontSize: '16px'
                    }}
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
                      style={{
                        padding: '15px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={e => {
                        const target = e.currentTarget;
                        target.style.transform = 'translateY(-2px)';
                        target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={e => {
                        const target = e.currentTarget;
                        target.style.transform = 'none';
                        target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                      }}
                    >
                      <h3>{profile.name}</h3>
                      <p>{profile.profile_type === 'band' ? '🎸 Band' : '🎵 Artist'}</p>
                      {profile.bio && <p>{profile.bio}</p>}
                      {profile.genres && profile.genres.length > 0 && (
                        <p style={{ fontSize: '0.9em', color: '#666' }}>
                          {profile.genres.join(' • ')}
                        </p>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => navigate('/create-profile')}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#4285f4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>👤</span>
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
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}