import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/useAuth';
import type { Profile } from '../../types/models';

interface Collaborator {
  profile: Profile;
}

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location: {
    place_name: '',
    latitude: 0,
    longitude: 0
  },
  status: 'upcoming' as const
};

export function CreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const profileId = new URLSearchParams(location.search).get('profile');
  
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Collaborator[]>([]);

  const { user } = useAuth();

  if (!profileId) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#f44336', marginBottom: '20px' }}>Error</h2>
        <p>No profile selected for creating an event.</p>
        <button
          onClick={() => navigate(-1)}
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
          Go Back
        </button>
      </div>
    );
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create an event');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Validate dates
      const startTime = new Date(form.start_time);
      const endTime = new Date(form.end_time);
      
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }

      // Create the event first
      const event = await eventService.createEvent({
        ...form,
        profile_id: profileId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

      // Then create collaborations separately
      if (selectedCollaborators.length > 0) {
        await Promise.all(
          selectedCollaborators.map(({ profile }) => 
            eventService.inviteCollaborator(event.id, profile.id)
          )
        );
      }

      // Navigate to the event detail page
      navigate(`/event/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCollaborators = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profileId)
        .ilike('name', `%${term}%`)
        .limit(5);

      setSearchResults(profiles || []);
    } catch (err) {
      console.error('Error searching profiles:', err);
    }
  };

  const addCollaborator = (profile: Profile) => {
    if (!selectedCollaborators.some(c => c.profile.id === profile.id)) {
      setSelectedCollaborators(prev => [...prev, { profile }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeCollaborator = (profileId: string) => {
    setSelectedCollaborators(prev => 
      prev.filter(c => c.profile.id !== profileId)
    );
  };

  return (
    <div className="create-event-container" style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '20px' }}>Create New Event</h2>
      
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
            Event Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
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
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              minHeight: '100px'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Start Time
            </label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              End Time
            </label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Location
          </label>
          <input
            type="text"
            value={form.location.place_name}
            onChange={e => setForm(prev => ({ 
              ...prev, 
              location: { ...prev.location, place_name: e.target.value }
            }))}
            placeholder="Enter location name"
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
            Collaborators
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleSearchCollaborators(e.target.value)}
            placeholder="Search for artists or bands"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
          
          {searchResults.length > 0 && (
            <div style={{
              marginTop: '5px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {searchResults.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => addCollaborator(profile)}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    backgroundColor: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{profile.name}</div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>
                    {profile.profile_type === 'band' ? '🎸 Band' : '🎵 Artist'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCollaborators.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h4>Selected Collaborators:</h4>
              {selectedCollaborators.map(({ profile }) => (
                <div
                  key={profile.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    marginTop: '5px'
                  }}
                >
                  <span>{profile.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCollaborator(profile.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '12px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '12px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              flex: 2
            }}
          >
            {isLoading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}