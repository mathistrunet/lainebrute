import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import MapPage from './pages/MapPage.jsx';
import AdsPage from './pages/AdsPage.jsx';
import ProducerDashboard from './pages/ProducerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MapPage />} />
        <Route path="/annonces" element={<AdsPage />} />
        <Route path="/producteur" element={<ProducerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
