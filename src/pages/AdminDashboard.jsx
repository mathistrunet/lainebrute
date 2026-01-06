import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const TAB_CONFIG = [
  { id: 'users', label: 'Utilisateurs' },
  { id: 'producers', label: 'Producteurs' },
  { id: 'offers', label: 'Offres' },
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

const normalizeAdminOffer = (offer) => {
  const producer = offer?.producer
    ? { id: offer.producer.id ?? null, name: offer.producer.name, city: offer.producer.city }
    : offer?.producer_id
    ? { id: offer.producer_id, name: offer.producer_name, city: offer.producer_city }
    : null;
  const owner = offer?.user ?? offer?.owner ?? null;
  return {
    id: offer?.id ?? null,
    title: offer?.title ?? '',
    availability_date: offer?.availability_date ?? '',
    quantity_kg: offer?.quantity_kg ?? '',
    delivery_radius_km: offer?.delivery_radius_km ?? '',
    sheep_breed: offer?.sheep_breed ?? '',
    description: offer?.description ?? '',
    city: offer?.city ?? '',
    created_at: offer?.created_at ?? null,
    producer,
    user: owner
      ? {
          id: owner.id ?? null,
          email: owner.email ?? null,
          role: owner.role ?? null,
        }
      : null,
  };
};

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [userEdits, setUserEdits] = useState({});
  const [userActionState, setUserActionState] = useState({});
  const [usersStatus, setUsersStatus] = useState({ state: 'idle', error: null });
  const [producers, setProducers] = useState([]);
  const [producerEdits, setProducerEdits] = useState({});
  const [producerActionState, setProducerActionState] = useState({});
  const [producersStatus, setProducersStatus] = useState({ state: 'idle', error: null });
  const [offers, setOffers] = useState([]);
  const [offerEdits, setOfferEdits] = useState({});
  const [offerActionState, setOfferActionState] = useState({});
  const [offersStatus, setOffersStatus] = useState({ state: 'idle', error: null });
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
      const data = await api.getAdminDatabase({ limit: 200 });
      setDatabaseTables(data ?? []);
      setDatabaseStatus({ state: 'success', error: null });
    } catch (error) {
      setDatabaseStatus({ state: 'error', error: error.message });
    }
  };

  const loadProducers = async () => {
    setProducersStatus({ state: 'loading', error: null });
    try {
      const data = await api.getAdminProducers();
      setProducers(data ?? []);
      const edits = (data ?? []).reduce((acc, producer) => {
        acc[producer.id] = {
          name: producer.name ?? '',
          city: producer.city ?? '',
          description: producer.description ?? '',
          first_name: producer.first_name ?? '',
          last_name: producer.last_name ?? '',
          phone: producer.phone ?? '',
          siret: producer.siret ?? '',
          lat: producer.lat ?? '',
          lng: producer.lng ?? '',
          show_identity: producer.show_identity ? 1 : 0,
          show_phone: producer.show_phone ? 1 : 0,
          show_siret: producer.show_siret ? 1 : 0,
        };
        return acc;
      }, {});
      setProducerEdits(edits);
      setProducersStatus({ state: 'success', error: null });
    } catch (error) {
      setProducersStatus({ state: 'error', error: error.message });
    }
  };

  const loadOffers = async () => {
    setOffersStatus({ state: 'loading', error: null });
    try {
      const data = await api.getAdminOffers();
      const normalized = (data ?? []).map((offer) => normalizeAdminOffer(offer));
      setOffers(normalized);
      const edits = normalized.reduce((acc, offer) => {
        acc[offer.id] = {
          title: offer.title ?? '',
          availability_date: offer.availability_date ?? '',
          quantity_kg: offer.quantity_kg ?? '',
          delivery_radius_km: offer.delivery_radius_km ?? '',
          sheep_breed: offer.sheep_breed ?? '',
          description: offer.description ?? '',
          city: offer.city ?? '',
        };
        return acc;
      }, {});
      setOfferEdits(edits);
      setOffersStatus({ state: 'success', error: null });
    } catch (error) {
      setOffersStatus({ state: 'error', error: error.message });
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
    if (activeTab === 'producers' && producersStatus.state === 'idle') {
      loadProducers();
    }
    if (activeTab === 'offers' && offersStatus.state === 'idle') {
      loadOffers();
    }
    if (activeTab === 'database' && databaseStatus.state === 'idle') {
      loadDatabase();
    }
    if (activeTab === 'traffic' && trafficStatus.state === 'idle') {
      loadTraffic();
    }
  }, [
    activeTab,
    usersStatus.state,
    producersStatus.state,
    offersStatus.state,
    databaseStatus.state,
    trafficStatus.state,
  ]);

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

  const handleProducerEdit = (producerId, field, value) => {
    setProducerEdits((prev) => ({
      ...prev,
      [producerId]: {
        ...(prev[producerId] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleProducerSave = async (producerId) => {
    const payload = producerEdits[producerId];
    if (!payload) {
      return;
    }
    setProducerActionState((prev) => ({ ...prev, [producerId]: { state: 'loading', error: null } }));
    try {
      const updated = await api.updateAdminProducer(producerId, payload);
      setProducers((prev) => prev.map((producer) => (producer.id === producerId ? updated : producer)));
      setProducerEdits((prev) => ({
        ...prev,
        [producerId]: {
          name: updated.name ?? '',
          city: updated.city ?? '',
          description: updated.description ?? '',
          first_name: updated.first_name ?? '',
          last_name: updated.last_name ?? '',
          phone: updated.phone ?? '',
          siret: updated.siret ?? '',
          lat: updated.lat ?? '',
          lng: updated.lng ?? '',
          show_identity: updated.show_identity ? 1 : 0,
          show_phone: updated.show_phone ? 1 : 0,
          show_siret: updated.show_siret ? 1 : 0,
        },
      }));
      setProducerActionState((prev) => ({ ...prev, [producerId]: { state: 'success', error: null } }));
    } catch (error) {
      setProducerActionState((prev) => ({
        ...prev,
        [producerId]: { state: 'error', error: error.message },
      }));
    }
  };

  const handleDeleteProducer = async (producerId) => {
    if (!window.confirm('Supprimer ce producteur ? Cette action est irréversible.')) {
      return;
    }
    setProducerActionState((prev) => ({ ...prev, [producerId]: { state: 'loading', error: null } }));
    try {
      await api.deleteAdminProducer(producerId);
      setProducers((prev) => prev.filter((producer) => producer.id !== producerId));
      setProducerActionState((prev) => ({ ...prev, [producerId]: { state: 'success', error: null } }));
    } catch (error) {
      setProducerActionState((prev) => ({
        ...prev,
        [producerId]: { state: 'error', error: error.message },
      }));
    }
  };

  const handleOfferEdit = (offerId, field, value) => {
    setOfferEdits((prev) => ({
      ...prev,
      [offerId]: {
        ...(prev[offerId] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleOfferSave = async (offerId) => {
    const payload = offerEdits[offerId];
    if (!payload) {
      return;
    }
    setOfferActionState((prev) => ({ ...prev, [offerId]: { state: 'loading', error: null } }));
    try {
      const updatePayload = {
        title: payload.title?.trim(),
        availability_date: payload.availability_date,
        quantity_kg: payload.quantity_kg === '' ? null : Number(payload.quantity_kg),
        delivery_radius_km:
          payload.delivery_radius_km === '' ? null : Number(payload.delivery_radius_km),
        sheep_breed: payload.sheep_breed?.trim(),
        description: payload.description?.trim() || null,
        city: payload.city?.trim() || null,
      };
      const updated = await api.updateOffer(offerId, updatePayload);
      const normalized = normalizeAdminOffer(updated);
      setOffers((prev) => prev.map((offer) => (offer.id === offerId ? normalized : offer)));
      setOfferEdits((prev) => ({
        ...prev,
        [offerId]: {
          title: normalized.title ?? '',
          availability_date: normalized.availability_date ?? '',
          quantity_kg: normalized.quantity_kg ?? '',
          delivery_radius_km: normalized.delivery_radius_km ?? '',
          sheep_breed: normalized.sheep_breed ?? '',
          description: normalized.description ?? '',
          city: normalized.city ?? '',
        },
      }));
      setOfferActionState((prev) => ({ ...prev, [offerId]: { state: 'success', error: null } }));
    } catch (error) {
      setOfferActionState((prev) => ({
        ...prev,
        [offerId]: { state: 'error', error: error.message },
      }));
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Supprimer cette offre ? Cette action est irréversible.')) {
      return;
    }
    setOfferActionState((prev) => ({ ...prev, [offerId]: { state: 'loading', error: null } }));
    try {
      await api.deleteOffer(offerId);
      setOffers((prev) => prev.filter((offer) => offer.id !== offerId));
      setOfferActionState((prev) => ({ ...prev, [offerId]: { state: 'success', error: null } }));
    } catch (error) {
      setOfferActionState((prev) => ({
        ...prev,
        [offerId]: { state: 'error', error: error.message },
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

  const renderProducers = () => {
    if (producersStatus.state === 'loading') {
      return <p>Chargement des producteurs...</p>;
    }
    if (producersStatus.state === 'error') {
      return <p className="error">{producersStatus.error}</p>;
    }
    if (!producers.length) {
      return <p>Aucun producteur trouvé.</p>;
    }
    return (
      <div className="admin-table__wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Compte</th>
              <th>Nom exploitation</th>
              <th>Ville</th>
              <th>Description</th>
              <th>Prénom</th>
              <th>Nom contact</th>
              <th>Téléphone</th>
              <th>SIRET</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Affichage</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {producers.map((producer) => {
              const edit = producerEdits[producer.id] ?? producer;
              const actionState = producerActionState[producer.id]?.state;
              const actionError = producerActionState[producer.id]?.error;
              const createdAt = producer.created_at
                ? new Date(producer.created_at).toLocaleDateString('fr-FR')
                : '—';
              return (
                <tr key={producer.id}>
                  <td>{producer.id}</td>
                  <td>
                    <div>
                      <strong>{producer.user_email}</strong>
                    </div>
                    <div className="muted">#{producer.user_id}</div>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.name ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'name', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.city ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'city', event.target.value)}
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      maxLength={450}
                      value={edit.description ?? ''}
                      onChange={(event) =>
                        handleProducerEdit(producer.id, 'description', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.first_name ?? ''}
                      onChange={(event) =>
                        handleProducerEdit(producer.id, 'first_name', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.last_name ?? ''}
                      onChange={(event) =>
                        handleProducerEdit(producer.id, 'last_name', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.phone ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'phone', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.siret ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'siret', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={edit.lat ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'lat', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={edit.lng ?? ''}
                      onChange={(event) => handleProducerEdit(producer.id, 'lng', event.target.value)}
                    />
                  </td>
                  <td>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.show_identity)}
                        onChange={(event) =>
                          handleProducerEdit(
                            producer.id,
                            'show_identity',
                            event.target.checked ? 1 : 0
                          )
                        }
                      />
                      Identité
                    </label>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.show_phone)}
                        onChange={(event) =>
                          handleProducerEdit(
                            producer.id,
                            'show_phone',
                            event.target.checked ? 1 : 0
                          )
                        }
                      />
                      Téléphone
                    </label>
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(edit.show_siret)}
                        onChange={(event) =>
                          handleProducerEdit(
                            producer.id,
                            'show_siret',
                            event.target.checked ? 1 : 0
                          )
                        }
                      />
                      SIRET
                    </label>
                  </td>
                  <td>{createdAt}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        disabled={actionState === 'loading'}
                        onClick={() => handleProducerSave(producer.id)}
                      >
                        Sauvegarder
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={actionState === 'loading'}
                        onClick={() => handleDeleteProducer(producer.id)}
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

  const renderOffers = () => {
    if (offersStatus.state === 'loading') {
      return <p>Chargement des offres...</p>;
    }
    if (offersStatus.state === 'error') {
      return <p className="error">{offersStatus.error}</p>;
    }
    if (!offers.length) {
      return <p>Aucune offre trouvée.</p>;
    }
    return (
      <div className="admin-table__wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Annonce</th>
              <th>Disponibilité</th>
              <th>Quantité (kg)</th>
              <th>Rayon (km)</th>
              <th>Race</th>
              <th>Description</th>
              <th>Ville</th>
              <th>Producteur</th>
              <th>Compte</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const edit = offerEdits[offer.id] ?? offer;
              const actionState = offerActionState[offer.id]?.state;
              const actionError = offerActionState[offer.id]?.error;
              const createdAt = offer.created_at
                ? new Date(offer.created_at).toLocaleDateString('fr-FR')
                : '—';
              return (
                <tr key={offer.id}>
                  <td>{offer.id}</td>
                  <td>
                    <input
                      type="text"
                      value={edit.title ?? ''}
                      onChange={(event) => handleOfferEdit(offer.id, 'title', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={edit.availability_date ?? ''}
                      onChange={(event) =>
                        handleOfferEdit(offer.id, 'availability_date', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={edit.quantity_kg ?? ''}
                      onChange={(event) =>
                        handleOfferEdit(offer.id, 'quantity_kg', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={edit.delivery_radius_km ?? ''}
                      onChange={(event) =>
                        handleOfferEdit(offer.id, 'delivery_radius_km', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.sheep_breed ?? ''}
                      onChange={(event) =>
                        handleOfferEdit(offer.id, 'sheep_breed', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      maxLength={450}
                      value={edit.description ?? ''}
                      onChange={(event) =>
                        handleOfferEdit(offer.id, 'description', event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edit.city ?? ''}
                      onChange={(event) => handleOfferEdit(offer.id, 'city', event.target.value)}
                    />
                  </td>
                  <td>
                    <div>{offer.producer?.name ?? '—'}</div>
                    <div className="muted">{offer.producer?.city ?? '—'}</div>
                  </td>
                  <td>
                    <div>{offer.user?.email ?? '—'}</div>
                    <div className="muted">#{offer.user?.id ?? '—'}</div>
                  </td>
                  <td>{createdAt}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        disabled={actionState === 'loading'}
                        onClick={() => handleOfferSave(offer.id)}
                      >
                        Sauvegarder
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={actionState === 'loading'}
                        onClick={() => handleDeleteOffer(offer.id)}
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
              <p className="muted">
                {table.rowCount ?? table.rows.length} lignes
                {table.truncated ? ' (extrait affiché)' : ''}
              </p>
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
        {activeTab === 'producers' && renderProducers()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'database' && renderDatabase()}
        {activeTab === 'traffic' && renderTraffic()}
      </div>
    </section>
  );
}

export default AdminDashboard;
