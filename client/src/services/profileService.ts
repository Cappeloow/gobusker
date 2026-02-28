import { supabase } from '../lib/supabase';
import type { Profile, BandMembership } from '../types/models';

export const profileService = {
  async uploadAvatar(file: File, profileId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profileId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  },
  async createProfile(profile: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
    owner_alias?: string;
    owner_specialty?: string;
    owner_description?: string;
  }) {
    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check for name uniqueness and generate suggestions if needed
    const { data: existingProfiles, error: nameCheckError } = await supabase
      .from('profiles')
      .select('name')
      .ilike('name', profile.name);

    if (nameCheckError) {
      throw new Error('Unable to check name availability. Please try again.');
    }

    // Find exact match
    const exactMatch = existingProfiles?.find(p => 
      p.name.toLowerCase() === profile.name.toLowerCase()
    );

    if (exactMatch) {
      // Generate suggestions
      const nameSuggestions = [];
      const baseName = profile.name;
      
      // Try with random numbers
      for (let i = 0; i < 4; i++) {
        let suggestion;
        if (i < 2) {
          // First two suggestions: simple incrementing numbers
          suggestion = `${baseName}${Math.floor(Math.random() * 99) + 1}`;
        } else {
          // Last two suggestions: longer random numbers
          suggestion = `${baseName}${Math.floor(Math.random() * 9999) + 1000}`;
        }
        nameSuggestions.push(suggestion);
      }

      const suggestionsText = nameSuggestions.join(', ');
      throw new Error(`This name is already taken. Try: ${suggestionsText}`);
    }

    // Extract owner member info
    const { owner_alias, owner_specialty, owner_description, ...profileData } = profile;

    // Create new profile with new UUID (not tied to user.id)
    // This allows one user to have multiple profiles
    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        user_id: user.id,  // Link to auth user, but don't use as profile ID
        ...profileData
        // id will be auto-generated
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    
    // After profile creation, add the creator as the owner in profile_members
    if (data && data.id) {
      const { error: memberError } = await supabase
        .from('profile_members')
        .insert([{
          profile_id: data.id,
          user_id: user.id,
          revenue_share: 100, // Owner gets 100%
          role: 'owner',
          alias: owner_alias || null,
          specialty: owner_specialty || null,
          description: owner_description || null
        }]);

      if (memberError) {
        console.error('Error adding creator as profile owner:', memberError);
        // Don't throw - profile was created successfully, just member addition failed
      }
    }
    
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

    // Get profile IDs where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('profile_members')
      .select('profile_id')
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    const profileIds = memberships?.map(m => m.profile_id) || [];

    if (profileIds.length === 0) {
      return [];
    }

    // Fetch all profiles where user is a member
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    if (error) throw error;
    return data;
  },

  async updateProfile(profileId: string, updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
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