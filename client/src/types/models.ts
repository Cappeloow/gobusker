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
  created_at: string;
  updated_at: string;
}