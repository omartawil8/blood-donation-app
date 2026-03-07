import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RequestDetail from './pages/RequestDetail';
import SelectHospital from './pages/SelectHospital';
import TopDonors from './pages/TopDonors';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { users } from './api/client';

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
        <Route index element={<Dashboard />} />
        <Route path="request/:requestId" element={<RequestDetail />} />
        <Route path="hospitals" element={<SelectHospital />} />
        <Route path="top-donors" element={<TopDonors />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
