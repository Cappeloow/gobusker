import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import { Dashboard } from './components/Dashboard';
import { CreateProfile } from './components/profile/CreateProfile';
import { ProfileDetail } from './components/profile/ProfileDetail';
import { CreateEvent } from './components/event/CreateEvent';
import { EventDetail } from './components/event/EventDetail';
import { LandingPage } from './components/landing/LandingPage';
import './App.css';

export default function App() {
  return (
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-profile" element={<CreateProfile />} />
          <Route path="/profile/:id" element={<ProfileDetail />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/event/:id" element={<EventDetail />} />
        </Routes>
      </Router>
    </div>
  );
}
