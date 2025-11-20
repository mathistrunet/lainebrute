import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import IdentityPanel from './IdentityPanel.jsx';
import { api } from '../api.js';

function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [isIdentityPanelOpen, setIsIdentityPanelOpen] = useState(false);

  const links = useMemo(() => {
    const commonLinks = [
      { to: '/', label: 'Carte' },
      { to: '/annonces', label: 'Annonces' },
    ];

    if (!user) {
      return commonLinks;
    }

    if (user.role === 'producer' || user.role === 'admin') {
      commonLinks.push({ to: '/producteur', label: 'Espace producteur' });
    }

    if (user.role === 'admin') {
      commonLinks.push({ to: '/admin', label: 'Admin' });
    }

    return commonLinks;
  }, [user]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">Laine Brute</div>
        <nav className="nav-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="account-actions">
          {user && (
            <div className="account-actions__user">
              <span className="eyebrow">Connecté</span>
              <span>{user.email}</span>
            </div>
          )}
          <button type="button" className="ghost" onClick={() => setIsIdentityPanelOpen(true)}>
            Connexion
          </button>
        </div>
      </header>
      <main className="app-content">
        {isIdentityPanelOpen && (
          <IdentityPanel
            user={user}
            onUserChange={setUser}
            onClose={() => setIsIdentityPanelOpen(false)}
          />
        )}
        <Outlet />
      </main>
      <footer className="app-footer">© {new Date().getFullYear()} Collectif Laine Brute</footer>
    </div>
  );
}

export default Layout;
