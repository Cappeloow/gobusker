import { useState } from 'react';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/models';

const INITIAL_FORM_STATE = {
  username: '',
  full_name: '',
  bio: '',
  profile_type: 'individual' as const,
  genres: [] as string[],
  instruments: [] as string[],
  social_links: {
    instagram: '',
    youtube: '',
    spotify: '',
    website: ''
  }
};

import { useNavigate } from 'react-router-dom';

export function CreateProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const profile = await profileService.createProfile({
        ...form,
        genres: form.genres.filter(Boolean),
        instruments: form.instruments.filter(Boolean)
      });
      // After successful profile creation, navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenreChange = (index: number, value: string) => {
    const newGenres = [...form.genres];
    newGenres[index] = value;
    setForm(prev => ({ ...prev, genres: newGenres }));
  };

  const addGenre = () => {
    setForm(prev => ({ ...prev, genres: [...prev.genres, ''] }));
  };

  const handleInstrumentChange = (index: number, value: string) => {
    const newInstruments = [...form.instruments];
    newInstruments[index] = value;
    setForm(prev => ({ ...prev, instruments: newInstruments }));
  };

  const addInstrument = () => {
    setForm(prev => ({ ...prev, instruments: [...prev.instruments, ''] }));
  };

  return (
    <div className="create-profile-container" style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Create Your Profile</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee', 
          color: '#c00',
          borderRadius: '4px',
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Profile Type
          </label>
          <select
            value={form.profile_type}
            onChange={e => setForm(prev => ({ ...prev, profile_type: e.target.value as 'individual' | 'band' }))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
            required
          >
            <option value="individual">Individual</option>
            <option value="band">Band</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Username
          </label>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Full Name
          </label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              minHeight: '100px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Genres
          </label>
          {form.genres.map((genre, index) => (
            <div key={index} style={{ marginBottom: '5px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={genre}
                onChange={e => handleGenreChange(index, e.target.value)}
                placeholder="Enter a genre"
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addGenre}
            style={{
              padding: '5px 10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add Genre
          </button>
        </div>

        {form.profile_type === 'individual' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Instruments
            </label>
            {form.instruments.map((instrument, index) => (
              <div key={index} style={{ marginBottom: '5px', display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={instrument}
                  onChange={e => handleInstrumentChange(index, e.target.value)}
                  placeholder="Enter an instrument"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addInstrument}
              style={{
                padding: '5px 10px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Instrument
            </button>
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Social Links
          </label>
          <input
            type="text"
            value={form.social_links.instagram}
            onChange={e => setForm(prev => ({ 
              ...prev, 
              social_links: { ...prev.social_links, instagram: e.target.value }
            }))}
            placeholder="Instagram URL"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '5px'
            }}
          />
          <input
            type="text"
            value={form.social_links.youtube}
            onChange={e => setForm(prev => ({ 
              ...prev, 
              social_links: { ...prev.social_links, youtube: e.target.value }
            }))}
            placeholder="YouTube URL"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '5px'
            }}
          />
          <input
            type="text"
            value={form.social_links.spotify}
            onChange={e => setForm(prev => ({ 
              ...prev, 
              social_links: { ...prev.social_links, spotify: e.target.value }
            }))}
            placeholder="Spotify URL"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: '5px'
            }}
          />
          <input
            type="text"
            value={form.social_links.website}
            onChange={e => setForm(prev => ({ 
              ...prev, 
              social_links: { ...prev.social_links, website: e.target.value }
            }))}
            placeholder="Website URL"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Creating...' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
}