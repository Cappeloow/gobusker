import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/models';
import { profileService } from '../services/profileService';

export function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        maxWidth: '800px', 
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1>Welcome to Your Dashboard</h1>
        <p>Logged in as: {userEmail}</p>
        
        <div style={{ marginTop: '20px' }}>
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
                  style={{
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                >
                  <h3>{profile.full_name}</h3>
                  <p>@{profile.username}</p>
                  <p>{profile.profile_type}</p>
                  {profile.bio && <p>{profile.bio}</p>}
                </div>
              ))}
              <button
                onClick={() => navigate('/create-profile')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '20px',
                  marginRight: '10px'
                }}
              >
                Create Another Profile
              </button>
            </div>
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