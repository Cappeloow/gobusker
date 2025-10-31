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
      .match({ event_id: eventId, profile_id: profileId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};