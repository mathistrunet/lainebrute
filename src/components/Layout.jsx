import { Link, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import IdentityPanel from './IdentityPanel.jsx';
import { api } from '../api.js';

function Layout() {
  const location = useLocation();
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [isIdentityPanelOpen, setIsIdentityPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState('login');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

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

  const openIdentity = (mode = 'login') => {
    setPanelMode(mode);
    setIsAccountMenuOpen(false);
    setIsIdentityPanelOpen(true);
  };

  const displayName = user?.profile?.firstName || user?.profile?.lastName
    ? `${user?.profile?.firstName ?? ''} ${user?.profile?.lastName ?? ''}`.trim()
    : user?.email;

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAccountMenuOpen(false);
  };

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
          {!user && (
            <button
              type="button"
              className="nav-login"
              onClick={() => openIdentity('login')}
            >
              Connexion
            </button>
          )}

          {user && (
            <div className="account-menu">
              <button
                type="button"
                className="account-menu__trigger"
                onClick={() => setIsAccountMenuOpen((value) => !value)}
              >
                <span className="eyebrow">Compte</span>
                <span>{displayName}</span>
              </button>
              {isAccountMenuOpen && (
                <div className="account-menu__dropdown">
                  <button type="button" onClick={() => openIdentity('profile')}>
                    Modifier le profil
                  </button>
                  <button type="button" onClick={handleLogout}>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="app-content">
        {isIdentityPanelOpen && (
          <div className="identity-overlay">
            <IdentityPanel
              user={user}
              onUserChange={setUser}
              onClose={() => setIsIdentityPanelOpen(false)}
              defaultMode={panelMode}
            />
          </div>
        )}
        <Outlet />
      </main>
      <footer className="app-footer">© {new Date().getFullYear()} Collectif Laine Brute</footer>
    </div>
  );
}

export default Layout;
