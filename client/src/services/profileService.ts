import { supabase } from '../lib/supabase';
import type { Profile, BandMembership } from '../types/models';

export const profileService = {
  async createProfile(profile: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    console.log('Creating profile with data:', profile);
    
    const { data, error } = await supabase.rpc('create_profile', {
      p_username: profile.username,
      p_full_name: profile.full_name,
      p_bio: profile.bio,
      p_profile_type: profile.profile_type,
      p_avatar_url: profile.avatar_url,
      p_social_links: profile.social_links,
      p_genres: profile.genres,
      p_instruments: profile.instruments
    });

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    
    console.log('Profile created successfully:', data);
    return data;
  },

  async getProfile(profileId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    return data;
  },

  async getCurrentUserProfiles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data;
  },

  async updateProfile(profileId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const bandService = {
  async createBandMembership(bandProfileId: string, memberProfileId: string, role: string) {
    const { data, error } = await supabase
      .from('band_memberships')
      .insert([{
        band_profile_id: bandProfileId,
        member_profile_id: memberProfileId,
        role
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getBandMembers(bandProfileId: string) {
    const { data, error } = await supabase
      .from('band_memberships')
      .select(`
        *,
        member:member_profile_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('band_profile_id', bandProfileId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  async updateMembershipStatus(membershipId: string, status: BandMembership['status']) {
    const { data, error } = await supabase
      .from('band_memberships')
      .update({ 
        status,
        ...(status === 'active' ? { joined_at: new Date().toISOString() } : {})
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};