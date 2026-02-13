import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Profile, EventInvite } from '../types/models';
import { profileService } from '../services/profileService';
import { eventService } from '../services/eventService';
import { createUserFriendlyError } from '../lib/errorHandling';
import { ErrorMessage, LoadingMessage } from './ui/ErrorMessage';
import { Wallet } from './Wallet';
import { Mail, Plus, Check, X, Calendar, MapPin } from 'lucide-react';

interface PendingInvite {
  id: string;
  invite_token: string;
  invitee_email: string;
  revenue_share: number;
  expires_at: string;
  profiles: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
  };
  inviter: {
    name?: string;
  };
}

interface PendingEventRequest {
  id: string;
  event_id: string;
  requester_profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  requester_profile: {
    id: string;
    name: string;
    avatar_url?: string;
    role?: string;
    bio?: string;
    performance_type?: string;
    genres?: string[];
  };
  event: {
    id: string;
    title: string;
    event_type: 'solo_performance' | 'open_mic' | 'venue_booking';
    start_time: string;
    location: {
      place_name: string;
    };
  };
}

export function Dashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Profile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [pendingEventInvites, setPendingEventInvites] = useState<EventInvite[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingEventRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profiles' | 'wallet' | 'requests' | 'invites'>('profiles');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPendingInvites = async () => {
    try {
      setInvitesError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const response = await fetch('http://localhost:3000/api/invites/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const invites = await response.json();
        setPendingInvites(invites);
      } else {
        const errorText = await response.text();
        const friendlyError = createUserFriendlyError({ message: `Failed to fetch invites: ${errorText}` });
        setInvitesError(friendlyError.message);
      }
    } catch (err) {
      const friendlyError = createUserFriendlyError(err);
      setInvitesError(friendlyError.message);
    }
  };

  const fetchPendingRequests = async () => {
    if (userProfiles.length === 0) return;
    
    try {
      setRequestsError(null);
      const profileIds = userProfiles.map(p => p.id);
      const requests = await eventService.getAllUserEventRequests(profileIds);
      setPendingRequests(requests);
    } catch (err) {
      const friendlyError = createUserFriendlyError(err);
      setRequestsError(friendlyError.message);
    }
  };

  const fetchPendingEventInvites = async () => {
    if (userProfiles.length === 0) return;
    
    try {
      setRequestsError(null);
      // Fetch event invites for all user profiles
      const allInvites = await Promise.all(
        userProfiles.map(profile => eventService.getMyEventInvites(profile.id))
      );
      
      // Flatten the results and filter for pending invites only
      const invites = allInvites.flat().filter(invite => invite.status === 'pending');
      setPendingEventInvites(invites);
    } catch (err) {
      const friendlyError = createUserFriendlyError(err);
      setRequestsError(friendlyError.message);
    }
  };

  const handleRequestResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      await eventService.updateEventRequestStatus(requestId, status);
      // Remove the request from the list
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  const handleEventInviteResponse = async (inviteId: string, status: 'accepted' | 'rejected') => {
    try {
      await eventService.updateEventInviteStatus(inviteId, status);
      // Remove the invite from the list
      setPendingEventInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error('Error updating event invite status:', err);
    }
  };

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
        setProfilesError(null);
        const profiles = await profileService.getCurrentUserProfiles();
        setUserProfiles(profiles);
        await fetchPendingInvites();
        // Skip pending requests if we don't have profiles yet
      } catch (err) {
        // If there's an error fetching profiles, we'll just show empty state
        const friendlyError = createUserFriendlyError(err);
        setProfilesError(friendlyError.message);
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

  // Fetch requests and event invites when user profiles are loaded
  useEffect(() => {
    if (userProfiles.length > 0) {
      fetchPendingRequests();
      fetchPendingEventInvites();
    }
  }, [userProfiles]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
        <div className="max-w-5xl mx-auto bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-8 shadow-xl">
          <LoadingMessage message="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-light-card dark:from-github-bg dark:to-github-card p-4">
      <div className="max-w-5xl mx-auto bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-light-text dark:text-github-text mb-2">Your Dashboard</h1>
            <p className="text-light-text-secondary dark:text-github-text-secondary">Logged in as: <span className="text-light-blue dark:text-github-blue">{userEmail}</span></p>
          </div>
          {/* Create Profile Button */}
          <div className="relative" ref={createMenuRef}>
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="p-3 rounded-lg bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white transition-all duration-200"
              title="Create Profile"
            >
              <Plus size={20} />
            </button>
            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    navigate('/create-profile');
                    setShowCreateMenu(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-light-text dark:text-github-text hover:bg-light-bg dark:hover:bg-github-bg transition-colors flex items-center gap-2"
                >
                  <span>🎵</span>
                  <span>Create New Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pending Invitations Banner */}
        {pendingInvites.length > 0 && (
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300">
                You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? 's' : ''}!
              </h2>
            </div>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-light-text dark:text-github-text mb-1">
                        {invite.profiles.name}
                      </h3>
                      <p className="text-sm text-light-text-secondary dark:text-github-text-secondary mb-2">
                        {invite.inviter.name || 'Someone'} invited you to join as a band member
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        💰 Revenue Share: {invite.revenue_share.toFixed(1)}% of tips
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/invite/${invite.invite_token}`)}
                      className="px-4 py-2 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-medium rounded-lg transition-colors"
                    >
                      View Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-light-border dark:border-github-border mb-8">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'profiles'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            Your Profiles
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'wallet'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            💰 Wallet
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            📥 Requests
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 flex items-center gap-2 ${
              activeTab === 'invites'
                ? 'text-light-blue dark:text-github-blue border-light-blue dark:border-github-blue'
                : 'text-light-text-secondary dark:text-github-text-secondary border-transparent hover:text-light-text dark:hover:text-github-text'
            }`}
          >
            🎵 Event Invites
            {pendingEventInvites.length > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingEventInvites.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'profiles' ? (
            <div>
              {profilesError && (
                <ErrorMessage 
                  error={profilesError}
                  title="Failed to load profiles"
                  action={
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-tan-dark text-white rounded-md hover:bg-tan-darker transition-colors text-sm"
                    >
                      Refresh Page
                    </button>
                  }
                  className="mb-6"
                />
              )}
              {!profilesError && userProfiles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text-secondary dark:text-github-text-secondary mb-6 text-lg">You haven't created any profiles yet.</p>
                  <button
                    onClick={() => navigate('/create-profile')}
                    className="px-6 py-3 bg-light-blue dark:bg-github-blue hover:bg-light-blue-dark dark:hover:bg-github-blue-dark text-white dark:text-github-text font-semibold rounded-lg transition-all duration-200"
                  >
                    Create Your First Profile
                  </button>
                </div>
              ) : (
                <div>
                  <div className="grid gap-4 mb-8">
                    {userProfiles.map(profile => (
                      <div 
                        key={profile.id}
                        onClick={() => navigate(`/profile/${profile.id}`)}
                        className="group p-6 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg cursor-pointer transition-all duration-300 hover:border-light-blue dark:hover:border-github-blue hover:shadow-lg hover:scale-[1.01]"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <img 
                              src={profile.avatar_url || 'https://via.placeholder.com/150/2d3748/e2e8f0?text=No+Image'} 
                              alt={`${profile.name}'s avatar`}
                              className="w-20 h-20 rounded-full object-cover border-4 border-light-border dark:border-github-border shadow-lg"
                            />
                          </div>
                          
                          {/* Content - All Left Aligned */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-light-text dark:text-github-text">{profile.name}</h3>
                              <span className="text-xs px-3 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary capitalize">
                                {profile.role === 'busker' ? '🎵 Busker' : profile.role === 'eventmaker' ? '📋 Event Maker' : '👁️ Viewer'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profile.genres && profile.genres.slice(0, 3).map((genre, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-muted dark:text-github-text-muted">
                                  {genre}
                                </span>
                              ))}
                              {profile.genres && profile.genres.length > 3 && (
                                <span className="text-xs px-2 py-1 text-light-text-muted dark:text-github-text-muted">
                                  +{profile.genres.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow */}
                          <div className="flex-shrink-0 text-light-text-secondary dark:text-github-text-secondary group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors">
                            <span className="text-2xl">→</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'wallet' ? (
            <Wallet userProfiles={userProfiles} />
          ) : activeTab === 'requests' ? (
            // Pending Requests Tab
            <div>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text-secondary dark:text-github-text-secondary mb-4 text-lg">
                    No pending performer requests.
                  </p>
                  <p className="text-light-text-muted dark:text-github-text-muted text-sm">
                    When people request to join your open mic or venue events, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-light-text dark:text-github-text mb-6">
                    Pending Performer Requests ({pendingRequests.length})
                  </h2>
                  {pendingRequests.map(request => (
                    <div key={request.id} className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Requester Info */}
                          <div className="flex-shrink-0">
                            <img
                              src={request.requester_profile.avatar_url || 'https://via.placeholder.com/150/2d3748/e2e8f0?text=No+Image'}
                              alt={request.requester_profile.name}
                              className="w-12 h-12 rounded-full object-cover border border-light-border dark:border-github-border"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 
                                  className="text-lg font-semibold text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue cursor-pointer transition-colors"
                                  onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                                >
                                  {request.requester_profile.name}
                                </h3>
                                <p className="text-sm text-light-text-secondary dark:text-github-text-secondary capitalize">
                                  {request.requester_profile.role} • {request.requester_profile.performance_type}
                                </p>
                              </div>
                            </div>
                            
                            {/* Event Info */}
                            <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-light-blue dark:text-github-blue" />
                                <span className="font-medium text-light-text dark:text-github-text">{request.event.title}</span>
                                <span className={`text-xs px-2 py-1 rounded ${request.event.event_type === 'open_mic' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {request.event.event_type === 'open_mic' ? '🎤 Open Mic' : '🏢 Venue'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-light-text-muted dark:text-github-text-muted">
                                <span>{new Date(request.event.start_time).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{request.event.location.place_name}</span>
                                </div>
                              </div>
                            </div>

                            {/* Message */}
                            {request.message && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200 italic">"'{request.message}"</p>
                              </div>
                            )}

                            {/* Genres */}
                            {request.requester_profile.genres && request.requester_profile.genres.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {request.requester_profile.genres.slice(0, 4).map((genre, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-full text-light-text-muted dark:text-github-text-muted">
                                    {genre}
                                  </span>
                                ))}
                                {request.requester_profile.genres.length > 4 && (
                                  <span className="text-xs px-2 py-1 text-light-text-muted dark:text-github-text-muted">
                                    +{request.requester_profile.genres.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}
                            
                            <p className="text-xs text-light-text-muted dark:text-github-text-muted">
                              Requested {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => navigate(`/profile/${request.requester_profile.id}`)}
                            className="px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border text-light-text dark:text-github-text hover:border-light-blue dark:hover:border-github-blue rounded-lg transition-colors text-sm"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => handleRequestResponse(request.id, 'accepted')}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
                            title="Accept Request"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRequestResponse(request.id, 'rejected')}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
                            title="Reject Request"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Event Invites Tab
            <div>
              {pendingEventInvites.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-text-secondary dark:text-github-text-secondary mb-4 text-lg">
                    No pending event invites.
                  </p>
                  <p className="text-light-text-muted dark:text-github-text-muted text-sm">
                    Event organizers can invite you to perform at their events. Invités will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-light-text dark:text-github-text mb-6">
                    Event Invites ({pendingEventInvites.length})
                  </h2>
                  {pendingEventInvites.map(invite => (
                    <div key={invite.id} className="bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Event Info */}
                          <div className="flex-shrink-0">
                            <Calendar className="w-12 h-12 text-green-500" />
                          </div>
                          
                          <div className="flex-1">
                            {/* Event Details */}
                            <div className="bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-light-blue dark:text-github-blue" />
                                <span className="font-medium text-light-text dark:text-github-text">{invite.event?.title}</span>
                                <span className={`text-xs px-2 py-1 rounded ${invite.event?.event_type === 'open_mic' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {invite.event?.event_type === 'open_mic' ? '🎤 Open Mic' : '🏢 Venue'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-light-text-muted dark:text-github-text-muted">
                                <span>{invite.event?.start_time ? new Date(invite.event.start_time).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'TBD'}</span>
                                {invite.event?.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{invite.event.location.place_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Inviter Info */}
                            <div className="flex items-center gap-3 mb-3">
                              {invite.inviter_profile?.avatar_url ? (
                                <img 
                                  src={invite.inviter_profile.avatar_url} 
                                  alt="" 
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-300 dark:bg-GitHub-border rounded-full flex items-center justify-center">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">📋</span>
                                </div>
                              )}
                              <div>
                                <h3 
                                  className="text-lg font-semibold text-light-text dark:text-github-text hover:text-light-blue dark:hover:text-github-blue cursor-pointer transition-colors"
                                  onClick={() => invite.inviter_profile && navigate(`/profile/${invite.inviter_profile.id}`)}
                                >
                                  {invite.inviter_profile?.name || 'Unknown'}
                                </h3>
                                <p className="text-sm text-light-text-secondary dark:text-github-text-secondary">
                                  invited you to perform
                                </p>
                              </div>
                            </div>

                            {/* Message */}
                            {invite.message && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg p-3 mb-2">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                  "{invite.message}"
                                </p>
                              </div>
                            )}
                            
                            <p className="text-xs text-light-text-muted dark:text-github-text-muted">
                              Invited {new Date(invite.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => invite.event && navigate(`/event/${invite.event.id}`)}
                            className="px-3 py-2 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border text-light-text dark:text-github-text hover:border-light-blue dark:hover:border-github-blue rounded-lg transition-colors text-sm"
                          >
                            View Event
                          </button>
                          <button
                            onClick={() => handleEventInviteResponse(invite.id, 'accepted')}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
                            title="Accept Invite"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEventInviteResponse(invite.id, 'rejected')}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
                            title="Decline Invite"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}