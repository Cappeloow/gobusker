import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Profile } from '../../types/models';
import { profileService } from '../../services/profileService';

export function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return;
      
      try {
        const data = await profileService.getProfile(id);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

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

  if (error || !profile) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '40px auto', 
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Error</h2>
        <p style={{ color: '#f44336' }}>{error || 'Profile not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '40px auto', 
      padding: '20px' 
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '30px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ marginBottom: '10px' }}>{profile.name}</h1>
            <p style={{ 
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: profile.profile_type === 'band' ? '#e3f2fd' : '#f3e5f5',
              borderRadius: '20px',
              fontSize: '0.9em',
              color: profile.profile_type === 'band' ? '#1565c0' : '#8e24aa',
              marginBottom: '20px'
            }}>
              {profile.profile_type === 'band' ? '🎸 Band' : '🎵 Artist'}
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>

        {profile.bio && (
          <div style={{ marginBottom: '20px' }}>
            <h3>About</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
          </div>
        )}

        {profile.genres && profile.genres.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Genres</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.genres.map((genre, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '20px',
                    fontSize: '0.9em'
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.profile_type === 'individual' && profile.instruments && profile.instruments.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Instruments</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {profile.instruments.map((instrument, index) => (
                <span
                  key={index}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '20px',
                    fontSize: '0.9em'
                  }}
                >
                  {instrument}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.social_links && Object.keys(profile.social_links).length > 0 && (
          <div>
            <h3>Connect</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {Object.entries(profile.social_links).map(([platform, url]) => 
                url ? (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      color: '#333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {platform === 'instagram' && '📸'}
                    {platform === 'youtube' && '🎥'}
                    {platform === 'spotify' && '🎵'}
                    {platform === 'website' && '🌐'}
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </a>
                ) : null
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(`/create-event?profile=${profile.id}`)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px'
            }}
          >
            <span style={{ fontSize: '20px' }}>📅</span>
            Create Event
          </button>
        </div>
      </div>
    </div>
  );
}