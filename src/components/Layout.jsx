import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Carte', end: true, className: 'site-nav__link--map' },
  { to: '/annonces', label: 'Annonces' },
  { to: '/producteur', label: 'Espace producteur' },
  { to: '/admin', label: 'Admin' },
];

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-title" aria-label="Nom du site">
          lainebrute.fr
        </div>
        <nav className="site-nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'site-nav__link',
                  item.className,
                  isActive ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default Layout;
