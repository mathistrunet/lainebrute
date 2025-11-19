import { useEffect, useState } from 'react';
import { api } from '../api.js';
import CityAutocomplete from '../components/CityAutocomplete.jsx';

const emptyOfferForm = { title: '', description: '', city: '' };
const emptyProfileForm = { name: '', city: '', description: '', lat: '', lng: '' };

const ProducerDashboard = () => {
  const [session, setSession] = useState(() => api.getCurrentUser());
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [profileForm, setProfileForm] = useState({ ...emptyProfileForm });
  const [offerForm, setOfferForm] = useState({ ...emptyOfferForm });
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
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'city' ? { lat: '', lng: '' } : {}),
    }));
  };

  const handleProfileCitySelect = (selection) => {
    setProfileForm((prev) => ({
      ...prev,
      city: selection.label,
      lat: typeof selection.lat === 'number' ? selection.lat.toFixed(6) : prev.lat,
      lng: typeof selection.lng === 'number' ? selection.lng.toFixed(6) : prev.lng,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    try {
      const payload = {
        name: profileForm.name,
        city: profileForm.city,
        description: profileForm.description,
        lat: profileForm.lat ? Number(profileForm.lat) : null,
        lng: profileForm.lng ? Number(profileForm.lng) : null,
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
              <p>
                Profil enregistré pour <strong>{profile.name}</strong> ({profile.city || 'Ville non renseignée'})
              </p>
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
                  <strong>{offer.title}</strong> — {offer.city || 'Ville non renseignée'}
                  {offer.description && <div>{offer.description}</div>}
                  <small>Publiée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}</small>
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
