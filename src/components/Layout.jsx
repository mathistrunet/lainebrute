import { Link, Outlet, useLocation } from 'react-router-dom';
import IdentityPanel from './IdentityPanel.jsx';

const links = [
  { to: '/', label: 'Carte' },
  { to: '/annonces', label: 'Annonces' },
  { to: '/producteur', label: 'Espace producteur' },
  { to: '/admin', label: 'Admin' },
];

function Layout() {
  const location = useLocation();

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
      </header>
      <main className="app-content">
        <IdentityPanel />
        <Outlet />
      </main>
      <footer className="app-footer">© {new Date().getFullYear()} Collectif Laine Brute</footer>
    </div>
  );
}

export default Layout;
