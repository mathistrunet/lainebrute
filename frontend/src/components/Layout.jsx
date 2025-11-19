import { NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <header>
        <h1>Plateforme d'annonces agricoles</h1>
        <nav>
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
