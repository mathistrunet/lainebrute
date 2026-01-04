import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const TAB_CONFIG = [
  { id: 'users', label: 'Utilisateurs' },
  { id: 'database', label: 'Base de données' },
  { id: 'traffic', label: 'Fréquentation' },
];

const roleOptions = [
  { value: 'producer', label: 'Producteur' },
  { value: 'buyer', label: 'Acheteur' },
  { value: 'admin', label: 'Administrateur' },
];

const formatCellValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [userActionState, setUserActionState] = useState({});
  const [usersStatus, setUsersStatus] = useState({ state: 'idle', error: null });
  const [databaseTables, setDatabaseTables] = useState([]);
  const [databaseStatus, setDatabaseStatus] = useState({ state: 'idle', error: null });
  const [traffic, setTraffic] = useState(null);
  const [trafficStatus, setTrafficStatus] = useState({ state: 'idle', error: null });

  const tabById = useMemo(
    () => TAB_CONFIG.reduce((acc, tab) => ({ ...acc, [tab.id]: tab }), {}),
    []
  );

  const loadUsers = async () => {
    setUsersStatus({ state: 'loading', error: null });
    try {
      const data = await api.getAdminUsers();
      setUsers(data ?? []);
      const edits = (data ?? []).reduce((acc, user) => {
        acc[user.id] = {
          email: user.email,
          role: user.role,
          is_blocked: user.is_blocked ? 1 : 0,
        };
        return acc;
      }, {});
      setUserEdits(edits);
      setUsersStatus({ state: 'success', error: null });
    } catch (error) {
      setUsersStatus({ state: 'error', error: error.message });
    }
  };

  const loadDatabase = async () => {
    setDatabaseStatus({ state: 'loading', error: null });
    try {
      const data = await api.getAdminDatabase();
      setDatabaseTables(data ?? []);
      setDatabaseStatus({ state: 'success', error: null });
    } catch (error) {
      setDatabaseStatus({ state: 'error', error: error.message });
    }
  };

  const loadTraffic = async () => {
    setTrafficStatus({ state: 'loading', error: null });
    try {
      const data = await api.getAdminTraffic();
      setTraffic(data ?? null);
      setTrafficStatus({ state: 'success', error: null });
    } catch (error) {
      setTrafficStatus({ state: 'error', error: error.message });
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && usersStatus.state === 'idle') {
      loadUsers();
    }
    if (activeTab === 'database' && databaseStatus.state === 'idle') {
      loadDatabase();
    }
    if (activeTab === 'traffic' && trafficStatus.state === 'idle') {
      loadTraffic();
    }
  }, [activeTab, usersStatus.state, databaseStatus.state, trafficStatus.state]);

  const handleUserEdit = (userId, field, value) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleUserSave = async (userId) => {
    const payload = userEdits[userId];
    if (!payload) {
      return;
    }
    setUserActionState((prev) => ({ ...prev, [userId]: { state: 'loading', error: null } }));
    try {
      const updated = await api.updateAdminUser(userId, payload);
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setUserEdits((prev) => ({
        ...prev,
        [userId]: {
          email: updated.email,
          role: updated.role,
          is_blocked: updated.is_blocked ? 1 : 0,
        },
      }));
      setUserActionState((prev) => ({ ...prev, [userId]: { state: 'success', error: null } }));
    } catch (error) {
      setUserActionState((prev) => ({
        ...prev,
        [userId]: { state: 'error', error: error.message },
      }));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }
    setUserActionState((prev) => ({ ...prev, [userId]: { state: 'loading', error: null } }));
    try {
      await api.deleteAdminUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setUserActionState((prev) => ({ ...prev, [userId]: { state: 'success', error: null } }));
    } catch (error) {
      setUserActionState((prev) => ({ ...prev, [userId]: { state: 'error', error: error.message } }));
    }
  };

  const renderUsers = () => {
    if (usersStatus.state === 'loading') {
      return <p>Chargement des utilisateurs...</p>;
    }
    if (usersStatus.state === 'error') {
      return <p className="error">{usersStatus.error}</p>;
    }
    if (!users.length) {
      return <p>Aucun utilisateur trouvé.</p>;
    }
    return (
      <div className="admin-table__wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const edit = userEdits[user.id] ?? user;
              const actionState = userActionState[user.id]?.state;
              const actionError = userActionState[user.id]?.error;
              return (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <input
                      type="email"
                      value={edit.email ?? ''}
                      onChange={(event) => handleUserEdit(user.id, 'email', event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={edit.role ?? 'producer'}
                      onChange={(event) => handleUserEdit(user.id, 'role', event.target.value)}
                    >
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.is_blocked)}
                        onChange={(event) =>
                          handleUserEdit(user.id, 'is_blocked', event.target.checked ? 1 : 0)
                        }
                      />
                      {edit.is_blocked ? 'Interdit' : 'Actif'}
                    </label>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        disabled={actionState === 'loading'}
                        onClick={() => handleUserSave(user.id)}
                      >
                        Sauvegarder
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={actionState === 'loading'}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                    {actionError && <p className="error">{actionError}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDatabase = () => {
    if (databaseStatus.state === 'loading') {
      return <p>Chargement des tables...</p>;
    }
    if (databaseStatus.state === 'error') {
      return <p className="error">{databaseStatus.error}</p>;
    }
    if (!databaseTables.length) {
      return <p>Aucune table disponible.</p>;
    }
    return (
      <div className="admin-database">
        {databaseTables.map((table) => (
          <div key={table.name} className="card admin-card">
            <div className="admin-card__header">
              <h2>{table.name}</h2>
              <p className="muted">{table.rows.length} lignes</p>
            </div>
            <div className="admin-table__wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    {table.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr key={`${table.name}-${index}`}>
                      {table.columns.map((column) => (
                        <td key={`${table.name}-${index}-${column}`}>{formatCellValue(row[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTraffic = () => {
    if (trafficStatus.state === 'loading') {
      return <p>Chargement des statistiques...</p>;
    }
    if (trafficStatus.state === 'error') {
      return <p className="error">{trafficStatus.error}</p>;
    }
    if (!traffic) {
      return <p>Aucune donnée de fréquentation disponible.</p>;
    }
    return (
      <div className="admin-traffic">
        <div className="grid">
          <div className="card admin-card">
            <h2>Utilisateurs</h2>
            <p className="admin-metric">{traffic.totals.users}</p>
            <p className="muted">Comptes créés</p>
          </div>
          <div className="card admin-card">
            <h2>Producteurs</h2>
            <p className="admin-metric">{traffic.totals.producers}</p>
            <p className="muted">Profils actifs</p>
          </div>
          <div className="card admin-card">
            <h2>Offres</h2>
            <p className="admin-metric">{traffic.totals.offers}</p>
            <p className="muted">Annonces publiées</p>
          </div>
        </div>
        <div className="grid">
          <div className="card admin-card">
            <h2>Nouveaux comptes (14 jours)</h2>
            <ul className="admin-list">
              {traffic.usersByDay.map((entry) => (
                <li key={`users-${entry.day}`}>
                  <strong>{entry.day}</strong> — {entry.count} création(s)
                </li>
              ))}
            </ul>
          </div>
          <div className="card admin-card">
            <h2>Offres publiées (14 jours)</h2>
            <ul className="admin-list">
              {traffic.offersByDay.map((entry) => (
                <li key={`offers-${entry.day}`}>
                  <strong>{entry.day}</strong> — {entry.count} offre(s)
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section>
      <h1>Espace administrateur</h1>
      <p>Gérez la base de données, les utilisateurs et la fréquentation du site.</p>

      <div className="identity-panel">
        <div className="identity-panel__header">
          <div>
            <p className="eyebrow">Administration</p>
            <h2>{tabById[activeTab]?.label ?? 'Tableau de bord'}</h2>
          </div>
          <div className="identity-panel__switch">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'users' && renderUsers()}
        {activeTab === 'database' && renderDatabase()}
        {activeTab === 'traffic' && renderTraffic()}
      </div>
    </section>
  );
}

export default AdminDashboard;
