import { useEffect, useState } from 'react';
import { api } from '../api.js';
import CityAutocomplete from '../components/CityAutocomplete.jsx';

const emptyOfferForm = { title: '', description: '', city: '' };
const emptyProfileForm = {
  name: '',
  city: '',
  description: '',
  lat: '',
  lng: '',
  first_name: '',
  last_name: '',
  phone: '',
  siret: '',
  show_identity: false,
  show_phone: false,
  show_siret: false,
};

const ProducerDashboard = () => {
  const [session, setSession] = useState(() => api.getCurrentUser());
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [profileForm, setProfileForm] = useState({ ...emptyProfileForm });
  const [offerForm, setOfferForm] = useState({ ...emptyOfferForm });
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [editingOfferForm, setEditingOfferForm] = useState({ ...emptyOfferForm });
  const [offers, setOffers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const isProducer = session?.role === 'producer';

  const resetMessages = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const loadProfile = () => {
    if (!isProducer) {
      setProfile(null);
      setProfileForm({ ...emptyProfileForm });
      return;
    }

    api
      .getMyProducerProfile()
      .then((data) => {
        setProfile(data);
        if (data) {
          setProfileForm({
            name: data.name ?? '',
            city: data.city ?? '',
            description: data.description ?? '',
            lat: data.lat ?? '',
            lng: data.lng ?? '',
            first_name: data.first_name ?? '',
            last_name: data.last_name ?? '',
            phone: data.phone ?? '',
            siret: data.siret ?? '',
            show_identity: Boolean(data.show_identity),
            show_phone: Boolean(data.show_phone),
            show_siret: Boolean(data.show_siret),
          });
        } else {
          setProfileForm({ ...emptyProfileForm });
        }
      })
      .catch((error) => setErrorMessage(error.message));
  };

  const loadOffers = () => {
    if (!isProducer) {
      setOffers([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    api
      .getMyOffers()
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
        setStatus('success');
      })
      .catch((error) => {
        setStatus('error');
        setErrorMessage(error.message);
      });
  };

  useEffect(() => {
    loadProfile();
    loadOffers();
  }, [isProducer]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      const user = await api.login(authForm.email, authForm.password);
      setSession(user);
      setAuthForm({ email: '', password: '' });
      setMessage('Connexion réussie.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      await api.register(authForm.email, authForm.password, 'producer');
      setMessage('Compte créé. Vous pouvez maintenant vous connecter.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setSession(null);
    setOffers([]);
    setProfile(null);
    setProfileForm({ ...emptyProfileForm });
    setOfferForm({ ...emptyOfferForm });
    setStatus('idle');
    setMessage('Déconnexion effectuée.');
  };

  const handleProfileChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleProfileCitySelect = (selection) => {
    setProfileForm((prev) => ({
      ...prev,
      city: selection.label,
      lat: typeof selection.lat === 'number' ? selection.lat.toFixed(6) : prev.lat,
      lng: typeof selection.lng === 'number' ? selection.lng.toFixed(6) : prev.lng,
    }));
  };

  const normalizeText = (value) => {
    if (typeof value !== 'string') {
      return value ?? null;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  const sanitizeSiretValue = (value) => {
    if (typeof value === 'number') {
      return String(Math.trunc(value));
    }
    if (typeof value !== 'string') {
      return '';
    }
    return value.replace(/\D/g, '');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      const normalizedSiret = sanitizeSiretValue(profileForm.siret);
      if (!normalizedSiret) {
        setErrorMessage('Le numéro de SIRET est obligatoire pour enregistrer votre exploitation.');
        return;
      }
      if (normalizedSiret.length !== 14) {
        setErrorMessage('Le numéro de SIRET doit contenir exactement 14 chiffres.');
        return;
      }
      const payload = {
        name: profileForm.name,
        city: profileForm.city,
        description: profileForm.description,
        lat: profileForm.lat ? Number(profileForm.lat) : null,
        lng: profileForm.lng ? Number(profileForm.lng) : null,
        first_name: normalizeText(profileForm.first_name),
        last_name: normalizeText(profileForm.last_name),
        phone: normalizeText(profileForm.phone),
        siret: normalizedSiret,
        show_identity: profileForm.show_identity,
        show_phone: profileForm.show_phone,
        show_siret: profileForm.show_siret,
      };
      const createdProfile = await api.createProducerProfile(payload);
      setProfile(createdProfile);
      setMessage('Profil producteur enregistré.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleOfferChange = (event) => {
    const { name, value } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditingOfferChange = (event) => {
    const { name, value } = event.target;
    setEditingOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      const newOffer = await api.createOffer({
        title: offerForm.title,
        description: offerForm.description,
        city: offerForm.city,
      });
      setOffers((prev) => [newOffer, ...prev]);
      setOfferForm({ ...emptyOfferForm });
      setMessage('Offre créée avec succès.');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleStartEditingOffer = (offer) => {
    setEditingOfferId(offer.id);
    setEditingOfferForm({
      title: offer.title ?? '',
      description: offer.description ?? '',
      city: offer.city ?? '',
    });
  };

  const handleCancelEditingOffer = () => {
    setEditingOfferId(null);
    setEditingOfferForm({ ...emptyOfferForm });
  };

  const handleUpdateOffer = async (event) => {
    event.preventDefault();
    if (!editingOfferId) {
      return;
    }
    resetMessages();
    try {
      const updatedOffer = await api.updateOffer(editingOfferId, {
        title: editingOfferForm.title,
        description: editingOfferForm.description,
        city: editingOfferForm.city,
      });
      setOffers((prev) => prev.map((offer) => (offer.id === updatedOffer.id ? updatedOffer : offer)));
      setMessage('Offre mise à jour.');
      handleCancelEditingOffer();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <section>
      <h2>Espace producteur</h2>
      <p>Gérez votre profil, créez vos offres et suivez leur publication.</p>

      <div>
        <h3>{session ? `Connecté en tant que ${session.email}` : 'Connexion / inscription'}</h3>
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
            <div className="actions">
              <button type="submit">Se connecter</button>
              <button type="button" onClick={handleRegister}>
                Créer un compte producteur
              </button>
            </div>
          </form>
        )}
      </div>

      {message && <p className="success">{message}</p>}
      {errorMessage && <p className="error">{errorMessage}</p>}

      {!isProducer && <p>Connectez-vous avec un compte producteur pour accéder à ces outils.</p>}

      {isProducer && (
        <>
          <div>
            <h3>Profil producteur</h3>
            {profile ? (
              <div>
                <p>
                  Profil enregistré pour <strong>{profile.name}</strong> ({profile.city || 'Ville non renseignée'})
                </p>
                {(profile.show_identity || profile.show_phone || profile.show_siret) && (
                  <ul>
                    {profile.show_identity && (profile.first_name || profile.last_name) && (
                      <li>
                        Contact : {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Non renseigné'}
                      </li>
                    )}
                    {profile.show_phone && profile.phone && <li>Téléphone : {profile.phone}</li>}
                    {profile.show_siret && profile.siret && <li>SIRET : {profile.siret}</li>}
                  </ul>
                )}
              </div>
            ) : (
              <p>Vous n'avez pas encore renseigné votre profil producteur.</p>
            )}
            <form onSubmit={handleProfileSubmit}>
              <label>
                Nom de l'exploitation
                <input name="name" value={profileForm.name} onChange={handleProfileChange} required />
              </label>
              <CityAutocomplete
                label="Ville"
                name="city"
                value={profileForm.city}
                onChange={handleProfileChange}
                onSelect={handleProfileCitySelect}
              />
              <label>
                Description
                <textarea name="description" value={profileForm.description} onChange={handleProfileChange} />
              </label>
              <div className="grid-two">
                <label>
                  Prénom du contact
                  <input name="first_name" value={profileForm.first_name} onChange={handleProfileChange} />
                </label>
                <label>
                  Nom du contact
                  <input name="last_name" value={profileForm.last_name} onChange={handleProfileChange} />
                </label>
              </div>
              <label>
                Numéro de téléphone
                <input name="phone" value={profileForm.phone} onChange={handleProfileChange} />
              </label>
              <label>
                Numéro de SIRET
                <input
                  name="siret"
                  value={profileForm.siret}
                  onChange={handleProfileChange}
                  required
                  inputMode="numeric"
                  placeholder="14 chiffres"
                />
              </label>
              <div className="grid-two">
                <label>
                  Latitude
                  <input name="lat" value={profileForm.lat} onChange={handleProfileChange} />
                </label>
                <label>
                  Longitude
                  <input name="lng" value={profileForm.lng} onChange={handleProfileChange} />
                </label>
              </div>
              <fieldset>
                <legend>Préférences d'affichage public</legend>
                <label>
                  <input
                    type="checkbox"
                    name="show_identity"
                    checked={profileForm.show_identity}
                    onChange={handleProfileChange}
                  />
                  Afficher mon nom et mon prénom sur la carte
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="show_phone"
                    checked={profileForm.show_phone}
                    onChange={handleProfileChange}
                  />
                  Afficher mon numéro de téléphone
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="show_siret"
                    checked={profileForm.show_siret}
                    onChange={handleProfileChange}
                  />
                  Afficher mon numéro de SIRET
                </label>
              </fieldset>
              <button type="submit">Enregistrer le profil</button>
            </form>
          </div>

          <div>
            <h3>Vos offres</h3>
            {status === 'loading' && <p>Chargement des offres...</p>}
            {status === 'error' && <p className="error">Impossible de charger vos offres.</p>}
            {offers.length === 0 && status === 'success' && <p>Aucune offre pour le moment.</p>}
            <ul>
              {offers.map((offer) => (
                <li key={offer.id}>
                  {editingOfferId === offer.id ? (
                    <form onSubmit={handleUpdateOffer} className="offer-edit-form">
                      <label>
                        Titre de l'offre
                        <input
                          name="title"
                          value={editingOfferForm.title}
                          onChange={handleEditingOfferChange}
                          required
                        />
                      </label>
                      <CityAutocomplete
                        label="Ville ou zone de livraison"
                        name="city"
                        value={editingOfferForm.city}
                        onChange={handleEditingOfferChange}
                        onSelect={(selection) =>
                          setEditingOfferForm((prev) => ({ ...prev, city: selection.label }))
                        }
                      />
                      <label>
                        Description
                        <textarea
                          name="description"
                          value={editingOfferForm.description}
                          onChange={handleEditingOfferChange}
                        />
                      </label>
                      <div className="actions">
                        <button type="submit">Enregistrer</button>
                        <button type="button" onClick={handleCancelEditingOffer}>
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <strong>{offer.title}</strong> — {offer.city || 'Ville non renseignée'}
                      {offer.description && <div>{offer.description}</div>}
                      <small>Publiée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}</small>
                      <div className="actions">
                        <button type="button" onClick={() => handleStartEditingOffer(offer)}>
                          Modifier
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Créer une nouvelle offre</h3>
            <form onSubmit={handleOfferSubmit}>
              <label>
                Titre de l'offre
                <input name="title" value={offerForm.title} onChange={handleOfferChange} required />
              </label>
              <CityAutocomplete
                label="Ville ou zone de livraison"
                name="city"
                value={offerForm.city}
                onChange={handleOfferChange}
                onSelect={(selection) =>
                  setOfferForm((prev) => ({ ...prev, city: selection.label }))
                }
              />
              <label>
                Description
                <textarea name="description" value={offerForm.description} onChange={handleOfferChange} />
              </label>
              <button type="submit">Publier l'offre</button>
            </form>
          </div>
        </>
      )}
    </section>
  );
};

export default ProducerDashboard;
