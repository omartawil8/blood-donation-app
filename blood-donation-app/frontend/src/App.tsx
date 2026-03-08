import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RequestDetail from './pages/RequestDetail';
import SelectHospital from './pages/SelectHospital';
import TopDonors from './pages/TopDonors';
import Profile from './pages/Profile';
import Login from './pages/Login';
import PastDonations from './pages/PastDonations';
import PastRequests from './pages/PastRequests';
import { NavDirectionProvider } from './components/NavDirection';
import { users } from './api/client';

function SelectHospitalRoute() {
  const navigate = useNavigate();
  return (
    <SelectHospital
      onClose={() => navigate(-1)}
      onSelect={() => navigate(-1)}
    />
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const userId = localStorage.getItem('bloodDonorUserId');
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) { setValid(false); return; }
    users.me()
      .then(() => setValid(true))
      .catch(() => {
        localStorage.removeItem('bloodDonorUserId');
        setValid(false);
      });
  }, [userId]);

  if (valid === null) return null; // loading
  if (!valid) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <NavDirectionProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Home />} />
          <Route path="donate" element={<Dashboard />} />
          <Route path="request/:requestId" element={<RequestDetail />} />
          <Route path="hospitals" element={<SelectHospitalRoute />} />
          <Route path="top-donors" element={<TopDonors />} />
          <Route path="profile" element={<Profile />} />
          <Route path="past-donations" element={<PastDonations />} />
          <Route path="past-requests" element={<PastRequests />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NavDirectionProvider>
  );
}
