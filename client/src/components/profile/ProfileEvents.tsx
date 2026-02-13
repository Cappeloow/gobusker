import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { EventCardSkeleton } from '../ui/SpecificSkeletons';
import type { Event } from '../../types/models';
import { Calendar, MapPin, Clock, Users, ChevronRight } from 'lucide-react';

interface ProfileEventsProps {
  profileId: string;
  isOwner?: boolean;
}

export function ProfileEvents({ profileId, isOwner }: ProfileEventsProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        // Get events created by this profile
        const createdEvents = await eventService.getProfileEvents(profileId);
        
        // Get events this profile is participating in (accepted invites/requests)
        const participatingEvents = await eventService.getProfileParticipatingEvents(profileId);
        
        // Combine and remove duplicates
        const allEvents = [...createdEvents, ...participatingEvents].filter((event, index, self) => 
          index === self.findIndex(e => e.id === event.id)
        );

        // Sort by start time
        allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        setEvents(allEvents);
      } catch (err) {
        console.error('Error loading events:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [profileId]);

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) > now);
  const pastEvents = events.filter(e => new Date(e.start_time) <= now);

  const displayEvents = filter === 'upcoming' 
    ? upcomingEvents 
    : filter === 'past' 
      ? pastEvents 
      : events;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'open_mic': return { label: 'Open Mic', icon: '🎪', color: 'purple' };
      case 'venue_booking': return { label: 'Venue', icon: '🏢', color: 'green' };
      default: return { label: 'Performance', icon: '🎤', color: 'blue' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'upcoming'
              ? 'bg-light-blue dark:bg-github-blue text-white'
              : 'bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue'
          }`}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'past'
              ? 'bg-light-blue dark:bg-github-blue text-white'
              : 'bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue'
          }`}
        >
          Past ({pastEvents.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-light-blue dark:bg-github-blue text-white'
              : 'bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue'
          }`}
        >
          All ({events.length})
        </button>
      </div>

      {/* Events List */}
      {displayEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-light-text-muted dark:text-github-text-muted" />
          <p className="text-light-text-secondary dark:text-github-text-secondary mb-2">
            {filter === 'upcoming' ? 'No upcoming events' : filter === 'past' ? 'No past events' : 'No events yet'}
          </p>
          {isOwner && filter === 'upcoming' && (
            <button
              onClick={() => navigate(`/create-event?profile=${profileId}`)}
              className="mt-4 px-4 py-2 bg-light-blue dark:bg-github-blue text-white rounded-lg font-medium hover:bg-light-blue-dark dark:hover:bg-github-blue-dark transition-colors"
            >
              Create Your First Event
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayEvents.map((event) => {
            const isPast = new Date(event.start_time) <= now;
            const typeInfo = getEventTypeLabel(event.event_type);
            
            return (
              <div
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className={`p-4 rounded-lg border cursor-pointer transition-all group ${
                  isPast 
                    ? 'bg-light-bg/50 dark:bg-github-bg/50 border-light-border dark:border-github-border opacity-75 hover:opacity-100' 
                    : 'bg-light-card dark:bg-github-card border-light-border dark:border-github-border hover:border-light-blue dark:hover:border-github-blue'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Date Badge */}
                  <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${
                    isPast 
                      ? 'bg-gray-200 dark:bg-gray-700' 
                      : 'bg-light-blue/10 dark:bg-github-blue/10 border border-light-blue/30 dark:border-github-blue/30'
                  }`}>
                    <span className={`text-xs font-bold uppercase ${isPast ? 'text-gray-500 dark:text-gray-400' : 'text-light-blue dark:text-github-blue'}`}>
                      {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className={`text-lg font-bold ${isPast ? 'text-gray-600 dark:text-gray-300' : 'text-light-text dark:text-github-text'}`}>
                      {new Date(event.start_time).getDate()}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        typeInfo.color === 'purple' 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                          : typeInfo.color === 'green'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-[#D2B48C]/10 dark:bg-[#D2B48C]/20 text-[#B8956F] dark:text-[#D2B48C]'
                      }`}>
                        {typeInfo.icon} {typeInfo.label}
                      </span>
                      {/* Show role indicator */}
                      {event.profile_id !== profileId && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                          🎵 Performing
                        </span>
                      )}
                      {event.profile_id === profileId && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          📋 Organizing
                        </span>
                      )}
                      {isPast && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Past
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-light-text dark:text-github-text truncate group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors">
                      {event.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-light-text-secondary dark:text-github-text-secondary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.start_time)}
                      </span>
                      {event.location?.place_name && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location.place_name}</span>
                        </span>
                      )}
                      {event.max_performers && event.max_performers > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.max_performers} slots
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-light-text-muted dark:text-github-text-muted group-hover:text-light-blue dark:group-hover:text-github-blue group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
