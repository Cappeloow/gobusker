import { supabase } from '../lib/supabase';
import type { Event } from '../types/models';

export const eventService = {
  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('events')
      // Pass the entire event object, which now includes category and subcategory.
      // Supabase will map the properties to the corresponding table columns.
      .insert([event])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }
    
    return data;
  },

  async getEventsByProfile(profileId: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        collaborators:event_collaborations(
          profile:profiles(id, name, avatar_url)
        )
      `)
      .eq('profile_id', profileId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getProfileEvents(profileId: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles(id, name, avatar_url)
      `)
      .eq('profile_id', profileId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data as Event[];
  },

  async getEvent(eventId: string) {
    // Just get the event and its profile for now
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles(
          id, 
          name, 
          profile_type, 
          avatar_url
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }

    if (!eventData) {
      console.error('No event data found for ID:', eventId);
      throw new Error('Event not found');
    }

    // Return event data with empty collaborators array for now
    const result = {
      ...eventData,
      collaborators: []
    };

    return result;
  },

  async inviteCollaborator(eventId: string, profileId: string) {
    const { data, error } = await supabase
      .from('event_collaborations')
      .insert([{
        event_id: eventId,
        profile_id: profileId,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCollaborationStatus(eventId: string, profileId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('event_collaborations')
      .update({ status })
      .eq('event_id', eventId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllEvents() {
    // First fetch events
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles(
          id,
          name,
          profile_type,
          avatar_url
        )
      `)
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Try to fetch accepted request counts (table may not exist yet)
    try {
      const { data: requestCounts } = await supabase
        .from('event_requests')
        .select('event_id')
        .eq('status', 'accepted');
      
      if (requestCounts) {
        // Count accepted requests per event
        const countMap: Record<string, number> = {};
        requestCounts.forEach(r => {
          countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
        });
        
        // Add count to each event
        return events?.map(event => ({
          ...event,
          accepted_requests_count: countMap[event.id] || 0
        })) || [];
      }
    } catch {
      // event_requests table doesn't exist yet, continue without counts
    }
    
    return events?.map(event => ({
      ...event,
      accepted_requests_count: 0
    })) || [];
  },

  async getEventsByLocation(latitude: number, longitude: number, radiusKm: number) {
    // This assumes your events table has location stored as a PostGIS point or similar
    // You might need to adjust the query based on your actual database schema
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles(
          id,
          name,
          profile_type,
          avatar_url
        )
      `)
      .order('start_time', { ascending: true });
      // For now, we'll fetch all events and filter client-side
      // TODO: Implement proper geospatial queries once database schema is updated

    if (error) throw error;
    
    // Simple client-side distance filtering
    return data.filter(event => {
      if (!event.location) return false;
      const distance = calculateDistance(
        latitude,
        longitude,
        event.location.latitude,
        event.location.longitude
      );
      return distance <= radiusKm;
    });
  },

  // Event Requests - for open mics and venue bookings
  async createEventRequest(eventId: string, requesterProfileId: string, message?: string) {
    try {
      const { data, error } = await supabase
        .from('event_requests')
        .insert([{
          event_id: eventId,
          requester_profile_id: requesterProfileId,
          message,
          status: 'pending'
        }])
        .select(`
          *,
          requester_profile:profiles!event_requests_requester_profile_id_fkey(
            id,
            name,
            avatar_url,
            role,
            bio
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error creating request:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Error in createEventRequest:', err);
      // If table doesn't exist, provide a helpful message
      if (err instanceof Error && err.message.includes('relation "event_requests" does not exist')) {
        throw new Error('The event requests table has not been created yet. Please run the database migrations.');
      }
      throw err;
    }
  },

  async getEventRequests(eventId: string) {
    const { data, error } = await supabase
      .from('event_requests')
      .select(`
        *,
        requester_profile:profiles!requester_profile_id(
          id,
          name,
          avatar_url,
          role,
          bio,
          performance_type,
          genres
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getMyEventRequests(profileId: string) {
    const { data, error } = await supabase
      .from('event_requests')
      .select(`
        *,
        event:events(
          id,
          title,
          start_time,
          end_time,
          location,
          profile:profiles(id, name, avatar_url)
        )
      `)
      .eq('requester_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateEventRequestStatus(requestId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('event_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEventRequest(requestId: string) {
    const { error } = await supabase
      .from('event_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  },

  async getAcceptedPerformers(eventId: string) {
    const { data, error } = await supabase
      .from('event_requests')
      .select(`
        *,
        requester_profile:profiles!requester_profile_id(
          id,
          name,
          avatar_url,
          role,
          bio
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'accepted');

    if (error) throw error;
    return data;
  },

  async hasUserRequestedEvent(eventId: string, profileId: string) {
    const { data, error } = await supabase
      .from('event_requests')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('requester_profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Event Invites - for event owners to directly invite performers
  async createEventInvite(eventId: string, invitedProfileId: string, inviterProfileId: string, message?: string) {
    const { data, error } = await supabase
      .from('event_invites')
      .insert([{
        event_id: eventId,
        invited_profile_id: invitedProfileId,
        inviter_profile_id: inviterProfileId,
        message,
        status: 'pending'
      }])
      .select(`
        *,
        invited_profile:profiles!invited_profile_id(
          id,
          name,
          avatar_url,
          role,
          bio
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async getEventInvites(eventId: string) {
    const { data, error } = await supabase
      .from('event_invites')
      .select(`
        *,
        invited_profile:profiles!invited_profile_id(
          id,
          name,
          avatar_url,
          role,
          bio,
          performance_type,
          genres
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getMyEventInvites(profileId: string) {
    const { data, error } = await supabase
      .from('event_invites')
      .select(`
        *,
        event:events(
          id,
          title,
          start_time,
          end_time,
          location,
          profile:profiles(id, name, avatar_url)
        ),
        inviter_profile:profiles!inviter_profile_id(id, name, avatar_url)
      `)
      .eq('invited_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateEventInviteStatus(inviteId: string, status: 'accepted' | 'rejected') {
    const { data, error } = await supabase
      .from('event_invites')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEventInvite(inviteId: string) {
    const { error } = await supabase
      .from('event_invites')
      .delete()
      .eq('id', inviteId);

    if (error) throw error;
  },

  async hasUserBeenInvited(eventId: string, profileId: string) {
    const { data, error } = await supabase
      .from('event_invites')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('invited_profile_id', profileId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Search profiles for inviting
  async searchProfilesForInvite(query: string, eventId: string) {
    // Get profiles that match the query and haven't been invited/requested already
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role, bio, performance_type, genres')
      .or(`name.ilike.%${query}%,stage_name.ilike.%${query}%`)
      .eq('role', 'busker')
      .limit(10);

    if (error) throw error;

    // Filter out profiles that have already been invited or have requested
    const { data: existingInvites } = await supabase
      .from('event_invites')
      .select('invited_profile_id')
      .eq('event_id', eventId);

    const { data: existingRequests } = await supabase
      .from('event_requests')
      .select('requester_profile_id')
      .eq('event_id', eventId);

    const invitedIds = new Set((existingInvites || []).map(i => i.invited_profile_id));
    const requestedIds = new Set((existingRequests || []).map(r => r.requester_profile_id));

    return (profiles || []).filter(p => !invitedIds.has(p.id) && !requestedIds.has(p.id));
  },

  // Get all pending requests across all user's events
  async getAllUserEventRequests(userProfileIds: string[]) {
    if (userProfileIds.length === 0) return [];

    try {
      // First get event IDs for user's events
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .in('profile_id', userProfileIds);

      if (eventsError) throw eventsError;
      if (!userEvents || userEvents.length === 0) return [];

      const eventIds = userEvents.map(e => e.id);

      // Then get requests for those events - but handle if table doesn't exist
      const { data, error } = await supabase
        .from('event_requests')
        .select(`
          *,
          requester_profile:profiles!event_requests_requester_profile_id_fkey (
            id,
            name,
            avatar_url,
            role,
            bio,
            performance_type,
            genres
          ),
          event:events!event_requests_event_id_fkey (
            id,
            title,
            event_type,
            start_time,
            location
          )
        `)
        .in('event_id', eventIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array
        if (error.message.includes('relation "event_requests" does not exist')) {
          console.log('event_requests table does not exist yet');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error('Error fetching user event requests:', err);
      return [];
    }
  },

  // Get all events where the profile is participating (accepted invites/requests)
  async getProfileParticipatingEvents(profileId: string) {
    const participatingEvents: Event[] = [];

    try {
      // Get events where profile accepted an invite 
      const { data: acceptedInvites, error: inviteError } = await supabase
        .from('event_invites')
        .select(`
          event:events(
            *,
            profile:profiles(id, name, avatar_url)
          )
        `)
        .eq('invited_profile_id', profileId)
        .eq('status', 'accepted');

      if (acceptedInvites && !inviteError) {
        participatingEvents.push(...(acceptedInvites.map(invite => invite.event).filter(Boolean) as Event[]));
      }

      // Get events where profile's request was accepted
      const { data: acceptedRequests, error: requestError } = await supabase
        .from('event_requests')
        .select(`
          event:events(
            *,
            profile:profiles(id, name, avatar_url)
          )
        `)
        .eq('requester_profile_id', profileId)
        .eq('status', 'accepted');

      if (acceptedRequests && !requestError) {
        participatingEvents.push(...(acceptedRequests.map(request => request.event).filter(Boolean) as Event[]));
      }

      // Remove duplicates and return
      const uniqueEvents = participatingEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      return uniqueEvents;
    } catch (err) {
      console.error('Error getting participating events:', err);
      return [];
    }
  }
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}