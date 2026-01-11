import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { eventService } from '../../services/eventService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/useAuth';
import type { Profile } from '../../types/models';
import { LocationSelectMap } from '../map/LocationSelectMap';

interface Collaborator {
  profile: Profile;
}

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  location: {
    place_name: '',
    latitude: 0,
    longitude: 0
  },
  status: 'upcoming' as const
};