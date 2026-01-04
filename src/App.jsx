import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import MapPage from './pages/MapPage.jsx';
import AdsPage from './pages/AdsPage.jsx';
import ProducerDashboard from './pages/ProducerDashboard.jsx';
import ProducerProfilePage from './pages/ProducerProfilePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TermsPage from './pages/TermsPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MapPage />} />
        <Route path="/annonces" element={<AdsPage />} />
        <Route path="/producteurs/:producerId" element={<ProducerProfilePage />} />
        <Route path="/producteur" element={<ProducerDashboard />} />
        <Route path="/producteur/ma-page" element={<ProducerProfilePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/conditions" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
    </Routes>
  );
}

export default App;
