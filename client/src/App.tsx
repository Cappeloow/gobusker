import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
import { Dashboard } from './components/Dashboard';
import { CreateProfile } from './components/profile/CreateProfile';
import { ProfileDetail } from './components/profile/ProfileDetail';
import { CreateEvent } from './components/event/CreateEvent';
import { ProfileShop } from './components/profile/ProfileShop';
import { EventDetail } from './components/event/EventDetail';
import { LandingPage } from './components/landing/LandingPage';
import { Success } from './components/payment/Success';
import { WithdrawalAdmin } from './components/admin/WithdrawalAdmin';
import { InvitePage } from './pages/InvitePage';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/create-profile" element={
            <ProtectedRoute>
              <CreateProfile />
            </ProtectedRoute>
          } />
          <Route path="/profile/:id" element={<ProfileDetail />} />
          <Route path="/profile/:id/shop" element={<ProfileShop />} />
          <Route path="/create-event" element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/payment/success" element={
            <ProtectedRoute>
              <Success />
            </ProtectedRoute>
          } />
          <Route path="/admin/withdrawals" element={
            <ProtectedRoute>
              <WithdrawalAdmin />
            </ProtectedRoute>
          } />
          <Route path="/invite/:token" element={
            <ProtectedRoute>
              <InvitePage />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}
