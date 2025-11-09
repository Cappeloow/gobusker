import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { useAuth } from '../../context/useAuth';
import type { Event } from '../../types/models';

interface EventWithCollaborators extends Event {
  profile: {
    id: string;
    name: string;
    profile_type: 'individual' | 'band';
    avatar_url?: string;
  };
  collaborators: Array<{
    profile: {
      id: string;
      name: string;
      avatar_url?: string;
    };
    status: 'pending' | 'accepted' | 'rejected';
  }>;
  category?: string;
  subcategory?: string;
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithCollaborators | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      
      try {
        const data = await eventService.getEvent(id);
        console.log('Received event data:', data); // Debug log
        if (!data) {
          throw new Error('No event data received');
        }
        setEvent(data as EventWithCollaborators);
      } catch (err) {
        console.error('Error loading event:', err); // Debug log
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  const handleCollaborationResponse = async (status: 'accepted' | 'rejected') => {
    if (!event || !user) return;

    try {
      await eventService.updateCollaborationStatus(event.id, user.id, status);
      // Reload event to get updated collaboration status
      const updatedEvent = await eventService.getEvent(event.id);
      setEvent(updatedEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collaboration status');
    }
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

  if (error || !event) {
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
        <p style={{ color: '#f44336' }}>{error || 'Event not found'}</p>
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
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ marginBottom: '10px' }}>{event.title}</h1>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <p style={{ 
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '20px',
                fontSize: '0.9em',
                color: '#1565c0'
              }}>
                {event.status}
              </p>
              <p style={{ 
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: '#f3e5f5',
                borderRadius: '20px',
                fontSize: '0.9em',
                color: '#8e24aa'
              }}>
                By {event.profile.name}
              </p>
              <p style={{ 
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: '#e0f2f1',
                borderRadius: '20px',
                fontSize: '0.9em',
                color: '#00796b'
              }}>
                {event.category}
                {event.subcategory && ` - ${event.subcategory}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
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

        <div style={{ marginBottom: '20px' }}>
          <h3>Event Details</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Date & Time</h3>
          <p>
            {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Location</h3>
          <p>{event.location.place_name}</p>
        </div>

        {event.collaborators && event.collaborators.length > 0 && (
          <div>
            <h3>Collaborators</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {event.collaborators.map(collab => (
                <div
                  key={collab.profile.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {collab.profile.avatar_url && (
                      <img
                        src={collab.profile.avatar_url}
                        alt={`${collab.profile.name}'s avatar`}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <span>{collab.profile.name}</span>
                  </div>
                  <div>
                    {collab.status === 'pending' && user?.id === collab.profile.id && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleCollaborationResponse('accepted')}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleCollaborationResponse('rejected')}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {collab.status !== 'pending' && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: collab.status === 'accepted' ? '#e8f5e9' : '#ffebee',
                        color: collab.status === 'accepted' ? '#2e7d32' : '#c62828',
                        borderRadius: '4px',
                        fontSize: '0.9em'
                      }}>
                        {collab.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}