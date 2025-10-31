import { supabase } from '../lib/supabase';
import type { Event } from '../types/models';

export const eventService = {
  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
    const eventData = {
      profile_id: event.profile_id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      status: event.status
    };

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
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

  async getEvent(eventId: string) {
    console.log('Fetching event with ID:', eventId);

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

    console.log('Final event data:', result);
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

    if (error) throw error;
    return data;
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