export interface Profile {
  id: string;
  user_id?: string;

  // Basic Info
  name: string;
  bio?: string;
  avatar_url?: string;

  // Role-based fields
  role: 'eventmaker' | 'busker' | 'viewer';
  profile_type?: 'individual' | 'band';

  // For Buskers
  stage_name?: string;
  performance_type?: 'music' | 'comedy' | 'magic' | 'art' | 'other';
  genres?: string[];
  instruments?: string[];
  social_links?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    website?: string;
  };

  // For Eventmakers
  organization_name?: string;
  contact_info?: string;
  event_types?: string[];

  // For Viewers
  location?: string;

  // Financial
  saldo?: number; // Accumulated balance from tips and sales

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface BandMembership {
  id: string;
  band_profile_id: string;
  member_profile_id: string;
  role: string;
  status: 'pending' | 'active' | 'rejected';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  profile_id: string;
  content: string;
  media_url?: string[];
  media_type?: 'image' | 'video' | 'audio';
  location?: {
    latitude: number;
    longitude: number;
    place_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: {
    latitude: number;
    longitude: number;
    place_name: string;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  category?: string;
  subcategory?: string;
  
  // Event type and performer slots
  event_type: 'solo_performance' | 'open_mic' | 'venue_booking';
  max_performers?: number; // For open_mic/venue_booking: how many slots available
  accepting_requests?: boolean; // Whether the event is accepting performer requests
  accepted_requests_count?: number; // Count of accepted performer requests
  
  profile?: Profile;
  created_at: string;
  updated_at: string;
}

// Performer requests to join an event (open mic, venue booking)
export interface EventRequest {
  id: string;
  event_id: string;
  requester_profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string; // Optional message from the requester
  requester_profile?: Profile;
  event?: Event;
  created_at: string;
  updated_at: string;
}

// Event owner invites a performer to join their event
export interface EventInvite {
  id: string;
  event_id: string;
  invited_profile_id: string;
  inviter_profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string; // Optional message from the inviter
  invited_profile?: Profile;
  inviter_profile?: Profile;
  event?: Event;
  created_at: string;
  updated_at: string;
}