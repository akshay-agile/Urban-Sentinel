/**
 * Urban Sentinel — Authority Dashboard
 *
 * Session 7: full router + pages. No auth wall on this internal tool for
 * now (not in this session's scope) — pure read/monitor + resolve.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import DashboardHome from './pages/DashboardHome';
import DevicesPage from './pages/DevicesPage';
import IncidentsPage from './pages/IncidentsPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
