import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { profileService } from '../../services/profileService';
import { useAuth } from '../../context/useAuth';
import type { Event, Profile, EventRequest } from '../../types/models';
import { Users, Music, Building2, Check, X, Send, Loader2, Clock, Mail, MapPin, Calendar, User, Star } from 'lucide-react';
import { Map, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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
  const location = useLocation();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventWithCollaborators | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Request system state
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [eventRequests, setEventRequests] = useState<EventRequestWithProfile[]>([]);
  const [eventInvites, setEventInvites] = useState<any[]>([]);
  const [existingRequest, setExistingRequest] = useState<{ id: string; status: string } | null>(null);
  const [existingInvite, setExistingInvite] = useState<{ id: string; status: string } | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const isEventOwner = user && event?.profile?.id && userProfiles.some(p => p.id === event.profile.id);
  const isEventInPast = event ? new Date(event.start_time) < new Date() : false;
  const hasAcceptedInvite = existingInvite?.status === 'accepted';
  const hasAcceptedRequest = existingRequest?.status === 'accepted';
  const isAlreadyParticipating = hasAcceptedInvite || hasAcceptedRequest;
  const canRequest = event?.accepting_requests && !isEventOwner && selectedProfileId && !existingRequest && !isEventInPast && !isAlreadyParticipating;

  // Handle event invite responses
  const handleEventInviteResponse = async (inviteId: string, status: 'accepted' | 'rejected') => {
    try {
      await eventService.updateEventInviteStatus(inviteId, status);
      // Update the existing invite state
      setExistingInvite({ id: inviteId, status });
      // Reload event data to update participant list
      if (id) {
        const data = await eventService.getEvent(id);
        if (data) {
          setEvent(data as EventWithCollaborators);
        }
      }
    } catch (err) {
      console.error('Error updating event invite status:', err);
    }
  };

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

        // If owner, load all requests and invites; otherwise check if user has requested or been invited
        if (ownsEvent) {
          const requests = await eventService.getEventRequests(event.id);
          setEventRequests(requests as EventRequestWithProfile[]);
          
          const invites = await eventService.getEventInvites(event.id);
          setEventInvites(invites);
        } else if (profiles.length > 0) {
          // Check if any of user's profiles has requested or been invited
          for (const profile of profiles) {
            const request = await eventService.hasUserRequestedEvent(event.id, profile.id);
            if (request) {
              setExistingRequest(request);
              setSelectedProfileId(profile.id);
            }
            
            const invite = await eventService.hasUserBeenInvited(event.id, profile.id);
            if (invite) {
              setExistingInvite(invite);
              setSelectedProfileId(profile.id);
            }
          }
          
          // Also load requests and invites for display (non-owners can see accepted performers)
          try {
            const requests = await eventService.getEventRequests(event.id);
            setEventRequests(requests as EventRequestWithProfile[]);
            
            const invites = await eventService.getEventInvites(event.id);
            setEventInvites(invites);
          } catch (err) {
            console.error('Error loading event participants:', err);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };

    loadUserData();
  }, [user, event]);

  const handleSubmitRequest = async () => {
    if (!event || !selectedProfileId) {
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await eventService.createEventRequest(event.id, selectedProfileId, requestMessage || undefined);
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
    <div className="w-full bg-gradient-to-br from-github-bg via-github-card to-github-bg min-h-screen">
      {/* Compact Header */}
      <div className="relative bg-gradient-to-r from-github-blue/20 to-purple-600/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => {
              const state = location.state as { 
                returnTo?: string; 
                mapState?: {
                  selectedEventId: string;
                  viewport: { latitude: number; longitude: number; zoom: number };
                  searchContext?: any;
                };
              } | null;
              
              if (state?.mapState && state.returnTo) {
                navigate(state.returnTo, { state: { mapState: state.mapState } });
              } else {
                navigate(-1);
              }
            }}
            className="mb-4 px-3 py-2 bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 rounded-lg transition-all text-sm"
          >
            ← Back
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Left: Title and basic info */}
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">{event.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full text-sm font-medium">
                  {event.status}
                </span>
                {event.event_type && EVENT_TYPE_CONFIG[event.event_type] && (
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${
                    event.event_type === 'open_mic' 
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                      : event.event_type === 'venue_booking'
                      ? 'bg-green-500/30 text-green-200 border border-green-400/30'
                      : 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                  }`}>
                    {(() => {
                      const Icon = EVENT_TYPE_CONFIG[event.event_type].icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {EVENT_TYPE_CONFIG[event.event_type].label}
                  </span>
                )}
                {event.max_performers && event.max_performers > 1 && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full text-sm">
                    {event.max_performers} slots
                  </span>
                )}
              </div>

              {/* Date and Time inline */}
              <div className="flex items-center gap-4 text-white">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-300" />
                  <span className="font-semibold">
                    {new Date(event.start_time).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(event.start_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })} - {new Date(event.end_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </span>
                </div>
                <span className="bg-blue-500/20 text-blue-200 px-2 py-1 rounded-full text-xs">
                  {(() => {
                    const start = new Date(event.start_time);
                    const end = new Date(event.end_time);
                    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
                    if (duration < 60) return `${duration}min`;
                    const hours = Math.floor(duration / 60);
                    const mins = duration % 60;
                    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
                  })()}
                </span>
              </div>
            </div>

            {/* Right: Compact map */}
            <div className="w-full lg:w-80">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 text-red-300" />
                    <span className="font-medium text-sm">Location</span>
                  </div>
                  {event.latitude && event.longitude && (
                    <span className="text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                      📍 Available
                    </span>
                  )}
                </div>
                <div className="h-24 relative group">
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      longitude: Number(event.longitude) || 18.0649,
                      latitude: Number(event.latitude) || 59.3293,
                      zoom: 14
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    interactive={false}
                  >
                    <Marker 
                      longitude={Number(event.longitude) || 18.0649} 
                      latitude={Number(event.latitude) || 59.3293}
                    >
                      <div className="w-4 h-4 bg-red-500 rounded-full border border-white shadow-lg animate-pulse" />
                    </Marker>
                  </Map>
                  <div 
                    className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200 cursor-pointer flex items-center justify-center"
                    onClick={() => {
                      const lat = event.latitude || 59.3293;
                      const lng = event.longitude || 18.0649;
                      const url = `https://www.google.com/maps?q=${lat},${lng}`;
                      window.open(url, '_blank');
                    }}
                    title="Click to open in Google Maps"
                  >
                    <div className="opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
                      View Directions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
      
        {/* Pending Invite Action - Compact */}
        {existingInvite && existingInvite.status === 'pending' && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 mb-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Mail className="w-6 h-6" />
                <div>
                  <h3 className="font-bold">You're Invited!</h3>
                  <p className="text-sm opacity-90">You've been invited to perform at this event</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEventInviteResponse(existingInvite.id, 'accepted')}
                  className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Accept
                </button>
                <button
                  onClick={() => handleEventInviteResponse(existingInvite.id, 'rejected')}
                  className="px-4 py-2 bg-white/20 text-white border border-white/30 font-semibold rounded-lg hover:bg-white/30 transition-all flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Description and Host combined */}
            <div className="bg-github-card border border-github-border rounded-xl p-4 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-github-text mb-3">About This Event</h2>
                  <p className="text-github-text-secondary leading-relaxed">{event.description}</p>
                  
                  {(event.category || event.subcategory) && (
                    <div className="mt-4">
                      <span className="inline-block px-3 py-1 bg-github-bg border border-github-border text-github-text-secondary rounded text-sm">
                        {event.category}
                        {event.subcategory && ` • ${event.subcategory}`}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Host info compact */}
                <div className="lg:w-64">
                  <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Host
                  </h3>
                  <div
                    onClick={() => navigate(`/profile/${event.profile.id}`)}
                    className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      {event.profile.avatar_url && (
                        <img
                          src={event.profile.avatar_url}
                          alt={event.profile.name}
                          className="w-10 h-10 rounded-full object-cover border border-blue-400/50"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-github-text group-hover:text-blue-400 transition-colors truncate">
                          {event.profile.name}
                        </h4>
                        <p className="text-xs text-github-text-secondary capitalize">
                          {event.profile.profile_type} • Organizer
                        </p>
                      </div>
                      <div className="text-blue-400 group-hover:translate-x-1 transition-transform">→</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Team - Performers */}
            {(eventRequests.filter(r => r.status === 'accepted').length > 0 || eventInvites.filter(i => i.status === 'accepted').length > 0 || event.event_type !== 'solo_performance') && (
              <div className="bg-github-card border border-github-border rounded-xl p-4 shadow-lg">
                <h2 className="text-xl font-bold text-github-text mb-4 flex items-center gap-2">
                  <Music className="w-5 h-5 text-green-400" />
                  Performers
                  {event.event_type !== 'solo_performance' && event.max_performers && (
                    <span className="text-sm text-github-text-muted">
                      ({eventRequests.filter(r => r.status === 'accepted').length + eventInvites.filter(i => i.status === 'accepted').length}/{event.max_performers})
                    </span>
                  )}
                </h2>
                
                {(eventRequests.filter(r => r.status === 'accepted').length > 0 || eventInvites.filter(i => i.status === 'accepted').length > 0) ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Accepted Requests */}
                    {eventRequests.filter(r => r.status === 'accepted').map(request => (
                      <div 
                        key={`request-${request.id}`}
                        onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                        className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {request.requester_profile.avatar_url ? (
                            <img
                              src={request.requester_profile.avatar_url}
                              alt={request.requester_profile.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-green-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-github-text group-hover:text-green-400 transition-colors truncate">
                              {request.requester_profile.name}
                            </h4>
                            <p className="text-xs text-github-text-secondary truncate">
                              {request.requester_profile.performance_type || 'Performer'}
                              {request.requester_profile.genres && request.requester_profile.genres.length > 0 && (
                                <span className="text-green-400"> • {request.requester_profile.genres.slice(0, 1).join(', ')}</span>
                              )}
                            </p>
                          </div>
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                    {/* Accepted Invites */}
                    {eventInvites.filter(i => i.status === 'accepted').map(invite => (
                      <div 
                        key={`invite-${invite.id}`}
                        onClick={() => navigate(`/profile/${invite.invited_profile.id}`)}
                        className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          {invite.invited_profile?.avatar_url ? (
                            <img
                              src={invite.invited_profile.avatar_url}
                              alt={invite.invited_profile.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-github-text group-hover:text-blue-400 transition-colors truncate">
                              {invite.invited_profile?.name || 'Performer'}
                            </h4>
                            <p className="text-xs text-github-text-secondary truncate">
                              {invite.invited_profile?.performance_type || 'Performer'}
                              {invite.invited_profile?.genres && invite.invited_profile.genres.length > 0 && (
                                <span className="text-blue-400"> • {invite.invited_profile.genres.slice(0, 1).join(', ')}</span>
                              )}
                            </p>
                          </div>
                          <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-github-bg border border-github-border rounded-lg text-center">
                    <Users className="w-6 h-6 text-github-text-muted mx-auto mb-2 opacity-50" />
                    <p className="text-github-text-secondary text-sm">No performers confirmed yet</p>
                    {event.accepting_requests && !isEventInPast && (
                      <p className="text-github-text-muted text-xs mt-1">Looking for talented performers!</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Collaborators - Compact */}
            {event.collaborators && event.collaborators.length > 0 && (
              <div className="bg-github-card border border-github-border rounded-xl p-4 shadow-lg">
                <h2 className="text-xl font-bold text-github-text mb-3">Collaborators</h2>
                <div className="grid md:grid-cols-2 gap-2">
                  {event.collaborators.map(collab => (
                    <div
                      key={collab.profile.id}
                      className="flex items-center justify-between p-3 bg-github-bg border border-github-border rounded-lg hover:border-github-blue transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {collab.profile.avatar_url && (
                          <img
                            src={collab.profile.avatar_url}
                            alt={`${collab.profile.name}'s avatar`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <span className="text-github-text font-medium text-sm">{collab.profile.name}</span>
                      </div>
                      <div>
                        {collab.status === 'pending' && user?.id === collab.profile.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCollaborationResponse('accepted')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleCollaborationResponse('rejected')}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        {collab.status !== 'pending' && (
                          <span className={`px-2 py-1 rounded text-xs ${
                            collab.status === 'accepted'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-red-900 text-red-200'
                          }`}>
                            {collab.status === 'accepted' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column - Compact Sidebar */}
          <div className="space-y-4">
            
            {/* Event Status Card - Compact */}
            <div className="bg-github-card border border-github-border rounded-xl p-4 shadow-lg">
              <h3 className="font-bold text-github-text mb-3">Event Status</h3>
              
              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-github-blue" />
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  isEventInPast 
                    ? 'bg-gray-500/20 text-gray-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {isEventInPast ? 'Ended' : 'Upcoming'}
                </span>
              </div>

              {/* Slot Progress for multi-performer events */}
              {event.event_type !== 'solo_performance' && event.max_performers && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-github-text-secondary">Slots</span>
                    <span className="font-medium text-github-text">
                      {eventRequests.filter(r => r.status === 'accepted').length + eventInvites.filter(i => i.status === 'accepted').length} / {event.max_performers}
                    </span>
                  </div>
                  <div className="w-full bg-github-border rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-github-blue to-blue-400 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, ((eventRequests.filter(r => r.status === 'accepted').length + eventInvites.filter(i => i.status === 'accepted').length) / event.max_performers) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${
                    event.accepting_requests && (eventRequests.filter(r => r.status === 'accepted').length + eventInvites.filter(i => i.status === 'accepted').length) < event.max_performers
                      ? 'text-green-400'
                      : 'text-github-text-muted'
                  }`}>
                    {event.accepting_requests && (eventRequests.filter(r => r.status === 'accepted').length + eventInvites.filter(i => i.status === 'accepted').length) < event.max_performers
                      ? 'Accepting performers'
                      : 'Slots full'}
                  </p>
                </div>
              )}

              {/* Participation Status */}
              {existingRequest ? (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  existingRequest.status === 'pending' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  existingRequest.status === 'accepted' ? 'bg-green-500/10 border border-green-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  {existingRequest.status === 'pending' && <Clock className="w-4 h-4 text-yellow-400" />}
                  {existingRequest.status === 'accepted' && <Check className="w-4 h-4 text-green-400" />}
                  {existingRequest.status === 'rejected' && <X className="w-4 h-4 text-red-400" />}
                  <div className="text-sm">
                    <div className="font-medium text-github-text">
                      {existingRequest.status === 'pending' ? 'Request Sent' : `Request ${existingRequest.status}`}
                    </div>
                    <div className="text-xs text-github-text-secondary">
                      {existingRequest.status === 'pending' ? 'Awaiting response' :
                       existingRequest.status === 'accepted' ? 'You\'re performing!' :
                       'Request declined'}
                    </div>
                  </div>
                </div>
              ) : existingInvite ? (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  existingInvite.status === 'pending' ? 'bg-blue-500/10 border border-blue-500/20' :
                  existingInvite.status === 'accepted' ? 'bg-green-500/10 border border-green-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  {existingInvite.status === 'pending' && <Mail className="w-4 h-4 text-blue-400" />}
                  {existingInvite.status === 'accepted' && <Check className="w-4 h-4 text-green-400" />}
                  {existingInvite.status === 'rejected' && <X className="w-4 h-4 text-red-400" />}
                  <div className="text-sm">
                    <div className="font-medium text-github-text">
                      {existingInvite.status === 'pending' ? 'Invited' : 
                       existingInvite.status === 'accepted' ? 'Performing' : 'Invite Declined'}
                    </div>
                    <div className="text-xs text-github-text-secondary">
                      {existingInvite.status === 'pending' ? 'Pending invitation' :
                       existingInvite.status === 'accepted' ? 'Confirmed to perform!' :
                       'You declined this invitation'}
                    </div>
                  </div>
                </div>
              ) : canRequest && (
                <div>
                  {!showRequestForm ? (
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="w-full py-3 bg-gradient-to-r from-github-blue to-blue-600 hover:from-github-blue-dark hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-102 flex items-center justify-center gap-2 shadow-lg"
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
                          className="w-full p-2 bg-github-bg border border-github-border rounded-lg text-github-text text-sm focus:border-github-blue focus:outline-none"
                        >
                          {userProfiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                      <textarea
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        placeholder="Tell them why you'd be perfect for this event..."
                        className="w-full p-2 bg-github-bg border border-github-border rounded-lg text-github-text placeholder:text-github-text-muted resize-none focus:border-github-blue focus:outline-none text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSubmitRequest}
                          disabled={isSubmittingRequest}
                          className="flex-1 py-2 bg-github-blue hover:bg-github-blue-dark text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          {isSubmittingRequest ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Send
                        </button>
                        <button
                          onClick={() => setShowRequestForm(false)}
                          className="px-3 py-2 bg-github-bg border border-github-border text-github-text rounded-lg hover:border-github-blue transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info messages for why user can't request */}
              {!user && (
                <p className="text-github-text-secondary text-sm text-center py-3 bg-github-bg rounded-lg">
                  Sign in to request to join events
                </p>
              )}
              {isEventInPast && (
                <div className="flex items-center gap-2 text-github-text-muted text-sm text-center py-3 bg-github-bg rounded-lg">
                  <Clock className="w-4 h-4" />
                  This event has ended
                </div>
              )}
            </div>

            {/* Pending Requests for Event Owner */}
            {isEventOwner && eventRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="bg-github-card border border-github-border rounded-xl p-4 shadow-lg">
                <h3 className="font-bold text-github-text mb-3">Pending Requests</h3>
                <div className="space-y-2">
                  {eventRequests.filter(r => r.status === 'pending').map(request => (
                    <div key={request.id} className="p-3 bg-github-bg border border-github-border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        {request.requester_profile.avatar_url ? (
                          <img
                            src={request.requester_profile.avatar_url}
                            alt={request.requester_profile.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-github-border rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-github-text-muted" />
                          </div>
                        )}
                        <p 
                          className="text-github-text font-medium hover:text-github-blue cursor-pointer transition-colors text-sm flex-1"
                          onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                        >
                          {request.requester_profile.name}
                        </p>
                      </div>
                      {request.message && (
                        <p className="text-github-text-secondary text-xs mb-2 line-clamp-2">{request.message}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRequestResponse(request.id, 'accepted')}
                          className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRequestResponse(request.id, 'rejected')}
                          className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}