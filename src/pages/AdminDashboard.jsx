import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AdminDashboard = () => {
  const [session, setSession] = useState(() => api.getCurrentUser());
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [users, setUsers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [databaseTables, setDatabaseTables] = useState([]);

  const isAdmin = session?.role === 'admin';

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      producers: users.filter((user) => user.role === 'producer').length,
      admins: users.filter((user) => user.role === 'admin').length,
      offers: offers.length,
    }),
    [users, offers]
  );

  const loadAdminData = () => {
    if (!isAdmin) {
      setUsers([]);
      setOffers([]);
      setDatabaseTables([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    Promise.all([api.getAdminUsers(), api.getAdminOffers(), api.getAdminDatabase()])
      .then(([usersResponse, offersResponse, databaseResponse]) => {
        setUsers(Array.isArray(usersResponse) ? usersResponse : []);
        setOffers(Array.isArray(offersResponse) ? offersResponse : []);
        setDatabaseTables(Array.isArray(databaseResponse) ? databaseResponse : []);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch((error) => {
        setStatus('error');
        setErrorMessage(error.message);
      });
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    try {
      const user = await api.login(authForm.email, authForm.password);
      if (user?.role !== 'admin') {
        setErrorMessage('Accès refusé : compte non administrateur.');
        api.logout();
        setSession(null);
        return;
      }
      setSession(user);
      setAuthForm({ email: '', password: '' });
      setMessage('Connexion administrateur réussie.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setSession(null);
    setUsers([]);
    setOffers([]);
    setDatabaseTables([]);
    setStatus('idle');
    setMessage('Déconnexion effectuée.');
  };

  const handleDeleteOffer = (offerId) => {
    setErrorMessage(null);
    api
      .deleteOffer(offerId)
      .then(() => {
        setOffers((prev) => prev.filter((offer) => offer.id !== offerId));
      })
      .catch((error) => setErrorMessage(error.message));
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) {
      return '—';
    }
    if (typeof value === 'string' && value.length > 160) {
      return `${value.slice(0, 157)}…`;
    }
    return String(value);
  };

  return (
    <section>
      <h2>Espace administrateur</h2>
      <p>Supervisez la plateforme et modérez les contenus.</p>

      <div>
        <h3>{session ? `Connecté en tant que ${session.email}` : 'Connexion administrateur'}</h3>
        {session ? (
          <button type="button" onClick={handleLogout}>
            Se déconnecter
          </button>
        ) : (
          <form onSubmit={handleLogin} className="form-inline">
            <input
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthChange}
              placeholder="Email"
              required
            />
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthChange}
              placeholder="Mot de passe"
              required
            />
            <button type="submit">Se connecter</button>
          </form>
        )}
      </div>

      {message && <p className="success">{message}</p>}
      {errorMessage && <p className="error">{errorMessage}</p>}

      {!isAdmin && <p>Connectez-vous avec un compte administrateur pour consulter ces données.</p>}

      {isAdmin && (
        <>
          {status === 'loading' && <p>Chargement des données...</p>}
          {status === 'error' && <p className="error">Impossible de récupérer les données d'administration.</p>}

          <div className="admin-stats">
            <p>Utilisateurs inscrits : {stats.totalUsers}</p>
            <p>Producteurs : {stats.producers}</p>
            <p>Administrateurs : {stats.admins}</p>
            <p>Total des offres : {stats.offers}</p>
          </div>

          <div>
            <h3>Utilisateurs</h3>
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <strong>{user.email}</strong> — rôle : {user.role}
                  <div>Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR')}</div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Toutes les offres</h3>
            <ul>
              {offers.map((offer) => (
                <li key={offer.id}>
                  <strong>{offer.title}</strong> — {offer.city || 'Ville non renseignée'}
                  {offer.description && <div>{offer.description}</div>}
                  <div>
                    Producteur : {offer.producer?.name || 'Inconnu'} ({offer.producer?.city || 'Ville inconnue'})
                  </div>
                  <div>Compte : {offer.user?.email}</div>
                  <small>Publiée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}</small>
                  <div style={{ marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => handleDeleteOffer(offer.id)}>
                      Supprimer l'offre
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Base de données complète</h3>
            <p>Visualisez chaque table SQLite comme dans un tableur pour suivre la plateforme.</p>
            {databaseTables.length === 0 && status === 'success' && (
              <p>Aucune table n'a encore été détectée.</p>
            )}
            {databaseTables.map((table) => {
              const rows = Array.isArray(table.rows) ? table.rows : [];
              const columns = table.columns ?? (rows?.[0] ? Object.keys(rows[0]) : []);
              return (
                <div key={table.name} className="admin-table">
                  <h4>Table {table.name}</h4>
                  {columns.length === 0 ? (
                    <p>Structure inconnue.</p>
                  ) : rows.length === 0 ? (
                    <p>Aucune donnée enregistrée.</p>
                  ) : (
                    <div className="admin-table__scroll">
                      <table>
                        <thead>
                          <tr>
                            {columns.map((column) => (
                              <th key={`${table.name}-${column}`}>{column}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr key={row.id ?? `${table.name}-${index}`}>
                              {columns.map((column) => (
                                <td key={`${table.name}-${column}-${row.id ?? index}`}>
                                  {formatCellValue(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

export default AdminDashboard;
