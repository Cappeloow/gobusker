import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import { Dashboard } from './components/Dashboard';
import { CreateProfile } from './components/profile/CreateProfile';
import './App.css';

export default function App() {
  return (
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-profile" element={<CreateProfile />} />
        </Routes>
      </Router>
    </div>
  );
}
