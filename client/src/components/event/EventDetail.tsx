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
        console.log('Received event data:', data);
        if (!data) {
          throw new Error('No event data received');
        }
        setEvent(data as EventWithCollaborators);
      } catch (err) {
        console.error('Error loading event:', err);
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
      const updatedEvent = await eventService.getEvent(event.id);
      setEvent(updatedEvent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update collaboration status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-github-bg to-github-card">
        <p className="text-github-text-secondary">Loading...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="w-full bg-gradient-to-br from-github-bg to-github-card min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto bg-github-card border border-github-border rounded-lg p-8">
          <h2 className="text-2xl font-bold text-github-text mb-4">Error</h2>
          <p className="text-red-500 mb-6">{error || 'Event not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-github-blue hover:bg-github-blue-dark text-white rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-github-bg to-github-card min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 px-4 py-2 bg-github-bg border border-github-border text-github-text hover:border-github-blue rounded transition-colors"
        >
          ← Back
        </button>

        <div className="bg-github-card border border-github-border rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-4xl font-bold text-github-text mb-8">{event.title}</h1>

          {/* Event Creator Section - Clickable */}
          <div
            onClick={() => navigate(`/profile/${event.profile.id}`)}
            className="mb-8 p-5 bg-github-bg border border-github-border rounded-lg hover:border-github-blue cursor-pointer transition-all duration-200 flex items-center gap-4 group"
          >
            {event.profile.avatar_url && (
              <img
                src={event.profile.avatar_url}
                alt={event.profile.name}
                className="w-16 h-16 rounded-full object-cover border border-github-border group-hover:border-github-blue transition-colors flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <p className="text-xs text-github-text-muted uppercase tracking-wide">Event Creator</p>
              <h3 className="text-xl font-bold text-github-text group-hover:text-github-blue transition-colors mt-1">
                {event.profile.name}
              </h3>
              <p className="text-sm text-github-text-secondary capitalize mt-1">{event.profile.profile_type}</p>
            </div>
            <span className="text-github-blue text-xl group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
          </div>

          {/* Event Status & Category */}
          <div className="flex flex-wrap gap-3 mb-8">
            <span className="inline-block px-3 py-1.5 bg-github-bg border border-github-blue text-github-blue rounded-full text-sm font-semibold">
              {event.status}
            </span>
            {event.category && (
              <span className="inline-block px-3 py-1.5 bg-github-bg border border-github-border text-github-text-secondary rounded-full text-sm">
                {event.category}
                {event.subcategory && ` - ${event.subcategory}`}
              </span>
            )}
          </div>

          {/* Event Details */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-github-text mb-3">Event Details</h2>
            <p className="text-github-text-secondary whitespace-pre-wrap">{event.description}</p>
          </div>

          {/* Date & Time */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-github-text mb-3">📅 Date & Time</h2>
            <p className="text-github-text-secondary">
              {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
            </p>
          </div>

          {/* Location */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-github-text mb-3">📍 Location</h2>
            <p className="text-github-text-secondary">{event.location.place_name}</p>
          </div>

          {/* Collaborators */}
          {event.collaborators && event.collaborators.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-github-text mb-4">Collaborators</h2>
              <div className="space-y-3">
                {event.collaborators.map(collab => (
                  <div
                    key={collab.profile.id}
                    className="flex items-center justify-between p-4 bg-github-bg border border-github-border rounded-lg hover:border-github-blue transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {collab.profile.avatar_url && (
                        <img
                          src={collab.profile.avatar_url}
                          alt={`${collab.profile.name}'s avatar`}
                          className="w-10 h-10 rounded-full object-cover border border-github-border"
                        />
                      )}
                      <span className="text-github-text font-medium">{collab.profile.name}</span>
                    </div>
                    <div>
                      {collab.status === 'pending' && user?.id === collab.profile.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCollaborationResponse('accepted')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleCollaborationResponse('rejected')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {collab.status !== 'pending' && (
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          collab.status === 'accepted'
                            ? 'bg-green-900 text-green-200'
                            : 'bg-red-900 text-red-200'
                        }`}>
                          {collab.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
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
    </div>
  );
}