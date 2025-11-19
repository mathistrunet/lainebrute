import { NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-title" aria-label="Nom du site">
          lainebrute.fr
        </div>
        <nav className="site-nav" aria-label="Navigation principale">
          <NavLink to="/" end>
            Carte
          </NavLink>
          <NavLink to="/annonces">
            Annonces
          </NavLink>
          <NavLink to="/producteur">
            Espace producteur
          </NavLink>
          <NavLink to="/admin">
            Admin
          </NavLink>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default Layout;
