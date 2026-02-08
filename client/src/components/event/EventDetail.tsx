import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/useAuth';
import type { Event, Profile, EventRequest } from '../../types/models';
import { Users, Music, Building2, Check, X, Send, Loader2 } from 'lucide-react';

interface EventWithCollaborators extends Omit<Event, 'profile'> {
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

interface EventRequestWithProfile extends EventRequest {
  requester_profile: {
    id: string;
    name: string;
    avatar_url?: string;
    role?: string;
    bio?: string;
    performance_type?: string;
    genres?: string[];
  };
}

const EVENT_TYPE_CONFIG = {
  solo_performance: { label: 'Solo Performance', icon: Music, color: 'blue' },
  open_mic: { label: 'Open Mic', icon: Users, color: 'purple' },
  venue_booking: { label: 'Venue Booking', icon: Building2, color: 'green' }
} as const;

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithCollaborators | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Request system state
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [eventRequests, setEventRequests] = useState<EventRequestWithProfile[]>([]);
  const [existingRequest, setExistingRequest] = useState<{ id: string; status: string } | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const isEventOwner = user && event?.profile?.id && userProfiles.some(p => p.id === event.profile.id);
  const canRequest = event?.accepting_requests && !isEventOwner && selectedProfileId && !existingRequest;

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      
      try {
        const data = await eventService.getEvent(id);
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

  // Load user profiles and requests
  useEffect(() => {
    const loadUserData = async () => {
      if (!user || !event) return;

      try {
        // Load user's profiles
        const profiles = await profileService.getCurrentUserProfiles();
        setUserProfiles(profiles);
        if (profiles.length > 0) {
          setSelectedProfileId(profiles[0].id);
        }

        // Check if user has a profile that owns this event
        const ownsEvent = profiles.some(p => p.id === event.profile.id);

        // If owner, load all requests; otherwise check if user has requested
        if (ownsEvent) {
          const requests = await eventService.getEventRequests(event.id);
          setEventRequests(requests as EventRequestWithProfile[]);
        } else if (profiles.length > 0) {
          // Check if any of user's profiles has requested
          for (const profile of profiles) {
            const request = await eventService.hasUserRequestedEvent(event.id, profile.id);
            if (request) {
              setExistingRequest(request);
              setSelectedProfileId(profile.id);
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };

    loadUserData();
  }, [user, event]);

  const handleSubmitRequest = async () => {
    console.log('handleSubmitRequest called', { event: event?.id, selectedProfileId, requestMessage });
    if (!event || !selectedProfileId) {
      console.log('Missing event or selectedProfileId', { event: !!event, selectedProfileId });
      return;
    }

    setIsSubmittingRequest(true);
    try {
      console.log('Creating event request...');
      await eventService.createEventRequest(event.id, selectedProfileId, requestMessage || undefined);
      console.log('Request created successfully');
      setExistingRequest({ id: '', status: 'pending' });
      setShowRequestForm(false);
      setRequestMessage('');
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleRequestResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await eventService.updateEventRequestStatus(requestId, status);
      // Refresh requests
      const requests = await eventService.getEventRequests(event!.id);
      setEventRequests(requests as EventRequestWithProfile[]);
    } catch (err) {
      console.error('Error updating request:', err);
      setError(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

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

          {/* Event Status, Type & Category */}
          <div className="flex flex-wrap gap-3 mb-8">
            <span className="inline-block px-3 py-1.5 bg-github-bg border border-github-blue text-github-blue rounded-full text-sm font-semibold">
              {event.status}
            </span>
            {event.event_type && EVENT_TYPE_CONFIG[event.event_type] && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                event.event_type === 'open_mic' 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : event.event_type === 'venue_booking'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {(() => {
                  const Icon = EVENT_TYPE_CONFIG[event.event_type].icon;
                  return <Icon className="w-3.5 h-3.5" />;
                })()}
                {EVENT_TYPE_CONFIG[event.event_type].label}
              </span>
            )}
            {event.max_performers && event.max_performers > 1 && (
              <span className="inline-block px-3 py-1.5 bg-github-bg border border-github-border text-github-text-secondary rounded-full text-sm">
                {event.max_performers} slots
              </span>
            )}
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
            <div className="mb-8">
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

          {/* Slot Availability & Request to Join Section */}
          {event.event_type !== 'solo_performance' && (
            <div className="mb-8 p-5 bg-github-bg border border-github-border rounded-lg">
              <h2 className="text-xl font-bold text-github-text mb-4">🎭 Performer Slots</h2>
              
              {/* Slot Progress */}
              {event.max_performers ? (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-github-text-secondary">
                      {eventRequests.filter(r => r.status === 'accepted').length} / {event.max_performers} slots filled
                    </span>
                    <span className={`font-medium ${
                      event.accepting_requests && eventRequests.filter(r => r.status === 'accepted').length < event.max_performers
                        ? 'text-green-400'
                        : 'text-github-text-muted'
                    }`}>
                      {event.accepting_requests && eventRequests.filter(r => r.status === 'accepted').length < event.max_performers
                        ? 'Accepting requests'
                        : 'Closed'}
                    </span>
                  </div>
                  <div className="w-full bg-github-border rounded-full h-2">
                    <div 
                      className="bg-github-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (eventRequests.filter(r => r.status === 'accepted').length / event.max_performers) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-github-text-secondary mb-4">
                  {event.accepting_requests ? 'Open for performers' : 'Not accepting performers'}
                </p>
              )}

              {/* Request Status or Form for non-owners */}
              {!isEventOwner && (
                <>
                  {existingRequest ? (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                      existingRequest.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      existingRequest.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {existingRequest.status === 'pending' && <Check className="w-4 h-4" />}
                      {existingRequest.status === 'accepted' && <Check className="w-4 h-4" />}
                      {existingRequest.status === 'rejected' && <X className="w-4 h-4" />}
                      <span className="capitalize font-medium">
                        {existingRequest.status === 'pending' ? 'Request sent' : `Request ${existingRequest.status}`}
                      </span>
                    </div>
                  ) : canRequest ? (
                    <div>
                      {!showRequestForm ? (
                        <button
                          onClick={() => {
                            console.log('Request to Join clicked', { canRequest, showRequestForm });
                            setShowRequestForm(true);
                          }}
                          className="w-full py-3 bg-github-blue hover:bg-github-blue-dark text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Request to Join
                        </button>
                      ) : (
                        <div className="space-y-3">
                          {userProfiles.length > 1 && (
                            <select
                              value={selectedProfileId}
                              onChange={(e) => setSelectedProfileId(e.target.value)}
                              className="w-full p-3 bg-github-card border border-github-border rounded-lg text-github-text"
                            >
                              {userProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                          <textarea
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            placeholder="Add a message (optional)..."
                            className="w-full p-3 bg-github-card border border-github-border rounded-lg text-github-text placeholder:text-github-text-muted resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSubmitRequest}
                              disabled={isSubmittingRequest}
                              className="flex-1 py-2 bg-github-blue hover:bg-github-blue-dark text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isSubmittingRequest ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Submit Request
                            </button>
                            <button
                              onClick={() => setShowRequestForm(false)}
                              className="px-4 py-2 bg-github-bg border border-github-border text-github-text rounded-lg hover:border-github-blue transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !user ? (
                    <p className="text-github-text-secondary text-sm text-center py-2">
                      Sign in to request to join this event
                    </p>
                  ) : !event.accepting_requests ? (
                    <p className="text-github-text-muted text-sm text-center py-2">
                      This event is not accepting performer requests
                    </p>
                  ) : userProfiles.length === 0 ? (
                    <p className="text-github-text-secondary text-sm text-center py-2">
                      Create a profile to request to join events
                    </p>
                  ) : (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-300 text-sm text-center">
                        Debug: Cannot request to join
                      </p>
                      <div className="text-xs text-yellow-200 mt-2 space-y-1">
                        <div>User: {user ? '✓' : '✗'}</div>
                        <div>Event accepting: {event.accepting_requests ? '✓' : '✗'}</div>
                        <div>Not owner: {!isEventOwner ? '✓' : '✗'}</div>
                        <div>Has profile: {selectedProfileId ? '✓' : '✗'}</div>
                        <div>No existing request: {!existingRequest ? '✓' : '✗'}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pending Requests for Event Owner */}
              {isEventOwner && eventRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-github-text mb-3">Pending Requests</h3>
                  <div className="space-y-3">
                    {eventRequests.filter(r => r.status === 'pending').map(request => (
                      <div key={request.id} className="flex items-center justify-between p-4 bg-github-card border border-github-border rounded-lg">
                        <div className="flex items-center gap-3">
                          {request.requester_profile.avatar_url && (
                            <img
                              src={request.requester_profile.avatar_url}
                              alt={request.requester_profile.name}
                              className="w-10 h-10 rounded-full object-cover border border-github-border"
                            />
                          )}
                          <div>
                            <p 
                              className="text-github-text font-medium hover:text-github-blue cursor-pointer transition-colors"
                              onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                            >
                              {request.requester_profile.name}
                            </p>
                            {request.message && (
                              <p className="text-github-text-secondary text-sm">{request.message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestResponse(request.id, 'accepted')}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRequestResponse(request.id, 'rejected')}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Performers */}
              {eventRequests.filter(r => r.status === 'accepted').length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-github-text mb-3">Confirmed Performers</h3>
                  <div className="flex flex-wrap gap-2">
                    {eventRequests.filter(r => r.status === 'accepted').map(request => (
                      <div 
                        key={request.id} 
                        className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/30 transition-colors"
                        onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                      >
                        {request.requester_profile.avatar_url && (
                          <img
                            src={request.requester_profile.avatar_url}
                            alt={request.requester_profile.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className="text-green-300 text-sm font-medium">{request.requester_profile.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}