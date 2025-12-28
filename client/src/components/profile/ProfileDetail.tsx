import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Profile } from '../../types/models';
import { profileService } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { ProfileQRCode } from './ProfileQRCode';
import { TipWall } from './TipWall';
import { BandMembersManager } from '../BandMembersManager';
import { ShoppingBag } from 'lucide-react';

export function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!id) return;
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const data = await profileService.getProfile(id);
        setProfile(data);

        // Check if current user is owner
        if (user) {
          try {
            const { data: profileMember, error: memberError } = await supabase
              .from('profile_members')
              .select('role')
              .eq('profile_id', id)
              .eq('user_id', user.id)
              .single();

            if (profileMember && profileMember.role === 'owner') {
              setIsOwner(true);
            } else if (memberError) {
              console.log('Member query error:', memberError);
              // If no member record, check if this is the profile owner by user_id
              const profileData = await profileService.getProfile(id);
              if (profileData.user_id === user.id) {
                setIsOwner(true);
              }
            }
          } catch (err) {
            console.error('Error checking owner status:', err);
            // Fallback: check if this user created the profile
            const profileData = await profileService.getProfile(id);
            if (profileData.user_id === user.id) {
              setIsOwner(true);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card flex items-center justify-center">
        <div className="text-github-text-secondary text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card p-4">
        <div className="max-w-2xl mx-auto bg-github-card border border-github-border rounded-lg p-8">
          <h2 className="text-2xl font-bold text-github-text mb-4">Error</h2>
          <p className="text-red-400 mb-6">{error || 'Profile not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-github-bg to-github-card p-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Profile Card */}
        <div className="bg-github-card border border-github-border rounded-lg p-8 mb-6 shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-8 border-b border-github-border">
            <div className="flex items-center gap-6 flex-1">
              {profile.avatar_url && (
                <img 
                  src={profile.avatar_url} 
                  alt={`${profile.name}'s avatar`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-github-border shadow-lg"
                />
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-github-text mb-4">{profile.name}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-4 py-2 bg-github-bg border border-github-border rounded-full text-sm font-semibold text-github-text-secondary capitalize">
                    {profile.role === 'busker' ? '🎵 Busker' : profile.role === 'eventmaker' ? '📋 Event Maker' : '👁️ Viewer'}
                  </span>
                  {profile.saldo !== undefined && profile.saldo > 0 && (
                    <span className="px-4 py-2 bg-green-900/20 border border-green-700 rounded-full text-sm font-semibold text-green-400 flex items-center gap-2">
                      <span>💰</span>
                      <span>Saldo: ${profile.saldo.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <ProfileQRCode
                profileUrl={window.location.href}
                profileName={profile.name}
              />
              <button
                onClick={() => navigate(`/profile/${id}/shop`)}
                className="p-3 rounded-lg bg-github-bg border border-github-border hover:border-github-blue text-github-text-secondary hover:text-github-blue transition-all duration-200"
                title="Go to Shop"
              >
                <ShoppingBag size={24} />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-github-bg border border-github-border hover:border-github-blue text-github-text hover:text-github-blue rounded-lg font-medium transition-all duration-200"
              >
                Back
              </button>
            </div>
          </div>

          {/* About Section */}
          {profile.bio && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-github-text mb-3">About</h3>
              <p className="text-github-text-secondary whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Genres Section */}
          {profile.genres && profile.genres.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-github-text mb-3">Genres</h3>
              <div className="flex flex-wrap gap-3">
                {profile.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-github-bg border border-github-border text-github-text-secondary rounded-full text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instruments Section */}
          {profile.role === 'busker' && profile.instruments && profile.instruments.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-github-text mb-3">Instruments</h3>
              <div className="flex flex-wrap gap-3">
                {profile.instruments.map((instrument, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-github-bg border border-github-border text-github-text-secondary rounded-full text-sm font-medium"
                  >
                    {instrument}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links Section */}
          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-github-text mb-3">Connect</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(profile.social_links).map(([platform, url]) => 
                  url ? (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-github-bg border border-github-border hover:border-github-blue text-github-text-secondary hover:text-github-blue rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                    >
                      {platform === 'instagram' && '📸'}
                      {platform === 'youtube' && '🎥'}
                      {platform === 'spotify' && '🎵'}
                      {platform === 'website' && '🌐'}
                      <span>{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Create Event Button */}
          <div className="mt-8 pt-8 border-t border-github-border flex justify-center">
            <button
              onClick={() => navigate(`/create-event?profile=${profile.id}`)}
              className="px-8 py-3 bg-github-blue hover:bg-github-blue-dark text-github-text font-semibold rounded-lg transition-all duration-200 flex items-center gap-3"
            >
              <span>📅</span>
              Create Event
            </button>
          </div>
        </div>

        {/* Band Members Section - Show for all members, but full management for owner */}
        {currentUserId && id && (
          <div className="bg-github-card border border-github-border rounded-lg p-8 shadow-xl mb-6">
            <BandMembersManager profileId={id} isOwner={isOwner} />
          </div>
        )}

        {/* Tip Wall Section */}
        <div className="bg-github-card border border-github-border rounded-lg p-8 shadow-xl">
          <TipWall profileId={profile.id} />
        </div>
      </div>
    </div>
  );
}