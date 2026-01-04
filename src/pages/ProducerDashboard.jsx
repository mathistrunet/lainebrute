import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const emptyProfile = {
  name: '',
  city: '',
  description: '',
  first_name: '',
  last_name: '',
  phone: '',
  siret: '',
};

function ProducerDashboard() {
  const currentUser = api.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const [profile, setProfile] = useState(emptyProfile);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState('idle');
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [ads, setAds] = useState([]);
  const [adsStatus, setAdsStatus] = useState('idle');
  const [adsError, setAdsError] = useState('');
  const [deletingAdId, setDeletingAdId] = useState(null);
  const [editingAdId, setEditingAdId] = useState(null);
  const [producers, setProducers] = useState([]);
  const [producersStatus, setProducersStatus] = useState('idle');
  const [producersError, setProducersError] = useState('');
  const [adForm, setAdForm] = useState({
    title: '',
    description: '',
    city: '',
  });

  const sortedAds = useMemo(
    () => [...ads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [ads],
  );

  const handleProfileChange = (field, value) => {
    setProfileForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleAdChange = (field, value) => {
    setAdForm((previous) => ({ ...previous, [field]: value }));
  };

  const resetAdForm = () => {
    setAdForm({ title: '', description: '', city: '' });
    setEditingAdId(null);
  };

  const handleAdSubmit = async (event) => {
    event.preventDefault();
    setAdsStatus('saving');
    setAdsError('');

    try {
      if (editingAdId) {
        const updated = await api.updateOffer(editingAdId, adForm);
        setAds((previous) =>
          previous.map((ad) => (ad.id === editingAdId ? updated : ad))
        );
      } else {
        const created = await api.createOffer(adForm);
        setAds((previous) => [created, ...previous]);
      }

      resetAdForm();
    } catch (error) {
      console.error(error);
      setAdsError(error?.message ?? "Impossible d'enregistrer l'annonce.");
    } finally {
      setAdsStatus('idle');
    }
  };

  const startEditAd = (ad) => {
    setEditingAdId(ad.id);
    setAdForm({
      title: ad.title,
      description: ad.description ?? '',
      city: ad.city ?? '',
    });
  };

  const handleDeleteAd = async (adId) => {
    setDeletingAdId(adId);
    setAdsError('');
    try {
      await api.deleteOffer(adId);
      setAds((previous) => previous.filter((ad) => ad.id !== adId));
      if (editingAdId === adId) {
        resetAdForm();
      }
    } catch (error) {
      console.error(error);
      setAdsError(error?.message ?? "Impossible de supprimer l'annonce.");
    } finally {
      setDeletingAdId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProducers = async () => {
      setProducersStatus('loading');
      setProducersError('');
      try {
        const result = await api.getProducers();
        if (!isMounted) return;
        setProducers(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setProducersError("Impossible de récupérer la liste des producteurs.");
      } finally {
        if (isMounted) {
          setProducersStatus('idle');
        }
      }
    };

    if (isAdmin) {
      loadProducers();
    }

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || !currentUser) return;
    let isMounted = true;

    const loadProfile = async () => {
      setProfileStatus('loading');
      setProfileError('');
      try {
        const data = await api.getMyProducerProfile();
        if (!isMounted) return;
        const normalized = data
          ? {
              name: data.name ?? '',
              city: data.city ?? '',
              description: data.description ?? '',
              first_name: data.first_name ?? '',
              last_name: data.last_name ?? '',
              phone: data.phone ?? '',
              siret: data.siret ?? '',
            }
          : emptyProfile;
        setProfile(normalized);
        setProfileForm(normalized);
        setIsEditingProfile(!data);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setProfileError(error?.message ?? 'Impossible de charger votre profil.');
      } finally {
        if (isMounted) {
          setProfileStatus('idle');
        }
      }
    };

    const loadOffers = async () => {
      setAdsStatus('loading');
      setAdsError('');
      try {
        const offers = await api.getMyOffers();
        if (!isMounted) return;
        setAds(Array.isArray(offers) ? offers : []);
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setAdsError(error?.message ?? 'Impossible de charger vos annonces.');
      } finally {
        if (isMounted) {
          setAdsStatus('idle');
        }
      }
    };

    loadProfile();
    loadOffers();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isAdmin]);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileStatus('saving');
    setProfileError('');
    setProfileMessage('');

    try {
      const payload = {
        name: profileForm.name?.trim(),
        city: profileForm.city?.trim() || null,
        description: profileForm.description?.trim() || null,
        first_name: profileForm.first_name?.trim() || null,
        last_name: profileForm.last_name?.trim() || null,
        phone: profileForm.phone?.trim() || null,
        siret: profileForm.siret?.trim(),
      };
      const saved = await api.createProducerProfile(payload);
      const normalized = {
        name: saved?.name ?? '',
        city: saved?.city ?? '',
        description: saved?.description ?? '',
        first_name: saved?.first_name ?? '',
        last_name: saved?.last_name ?? '',
        phone: saved?.phone ?? '',
        siret: saved?.siret ?? '',
      };
      setProfile(normalized);
      setProfileForm(normalized);
      setIsEditingProfile(false);
      setProfileMessage('Informations enregistrées.');
    } catch (error) {
      console.error(error);
      setProfileError(error?.message ?? "Impossible d'enregistrer votre profil.");
    } finally {
      setProfileStatus('idle');
    }
  };

  const handleProfileCancel = () => {
    setProfileForm(profile);
    setProfileError('');
    setProfileMessage('');
    setIsEditingProfile(false);
  };

  if (isAdmin) {
    return (
      <section className="producer-dashboard">
        <h1>Espace producteur</h1>
        <p>Accédez aux espaces producteurs pour suivre leurs informations et leurs annonces.</p>

        <section className="card">
          <div className="section-header">
            <div>
              <h2>Liste des producteurs</h2>
              <p className="muted">
                Cliquez sur un producteur pour ouvrir son espace et consulter ses annonces.
              </p>
            </div>
          </div>

          {producersStatus === 'loading' && (
            <p className="muted">Chargement des producteurs...</p>
          )}
          {producersError && <p className="error">{producersError}</p>}

          {!producersError && producersStatus !== 'loading' && (
            <>
              {producers.length === 0 ? (
                <p className="muted">Aucun producteur disponible pour le moment.</p>
              ) : (
                <ul className="card-list">
                  {producers.map((producer) => (
                    <li key={producer.id} className="card">
                      <div className="card__content">
                        <div className="eyebrow">Producteur</div>
                        <h3>{producer.name}</h3>
                        <p>{producer.city ?? 'Ville non renseignée'}</p>
                        <p>
                          Contact :{' '}
                          {producer.email || producer.phone
                            ? [producer.email, producer.phone].filter(Boolean).join(' · ')
                            : 'Non renseigné'}
                        </p>
                      </div>
                      <Link to={`/producteurs/${producer.id}`} className="ghost">
                        Voir l&apos;espace producteur
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="producer-dashboard">
        <h1>Espace producteur</h1>
        <p className="error">Connectez-vous pour accéder à votre espace producteur.</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  if (currentUser.role !== 'producer') {
    return (
      <section className="producer-dashboard">
        <h1>Espace producteur</h1>
        <p className="error">Cet espace est réservé aux producteurs enregistrés.</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  return (
    <section className="producer-dashboard">
      <h1>Espace producteur</h1>
      <p>Gérez vos informations publiques et vos annonces produits.</p>

      <div className="grid-2-cols">
        {isEditingProfile ? (
          <form className="form-card" onSubmit={handleProfileSave}>
            <div className="section-header">
              <div>
                <h2>Coordonnées et présentation</h2>
                <p className="muted">Modifiez vos informations publiques puis enregistrez.</p>
              </div>
            </div>
            <label>
              Nom de l'exploitation
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => handleProfileChange('name', event.target.value)}
                placeholder="Nom de l'exploitation"
                required
              />
            </label>
            <label>
              Ville
              <input
                type="text"
                value={profileForm.city}
                onChange={(event) => handleProfileChange('city', event.target.value)}
                placeholder="Ville"
              />
            </label>
            <label>
              Prénom
              <input
                type="text"
                value={profileForm.first_name}
                onChange={(event) => handleProfileChange('first_name', event.target.value)}
                placeholder="Prénom"
              />
            </label>
            <label>
              Nom
              <input
                type="text"
                value={profileForm.last_name}
                onChange={(event) => handleProfileChange('last_name', event.target.value)}
                placeholder="Nom"
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(event) => handleProfileChange('phone', event.target.value)}
                placeholder="06 xx xx xx xx"
              />
            </label>
            <label>
              SIRET
              <input
                type="text"
                value={profileForm.siret}
                onChange={(event) => handleProfileChange('siret', event.target.value)}
                placeholder="14 chiffres"
                required
              />
            </label>
            <label>
              Description de l'exploitation
              <textarea
                rows="3"
                value={profileForm.description}
                onChange={(event) => handleProfileChange('description', event.target.value)}
                placeholder="Expliquez votre élevage, vos pratiques..."
              />
            </label>
            <p className="helper-text">Ces informations sont visibles sur votre page producteur.</p>
            {profileError && <p className="error">{profileError}</p>}
            {profileMessage && <p className="success">{profileMessage}</p>}
            <div className="form-actions">
              <button type="submit" disabled={profileStatus === 'saving'}>
                {profileStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer et quitter'}
              </button>
              <button type="button" className="ghost" onClick={handleProfileCancel}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="card">
            <div className="section-header">
              <div>
                <h2>Coordonnées et présentation</h2>
                <p className="muted">Ces informations sont visibles sur votre page producteur.</p>
              </div>
              <button type="button" className="ghost" onClick={() => setIsEditingProfile(true)}>
                Modifier
              </button>
            </div>
            {profileError && <p className="error">{profileError}</p>}
            {profileMessage && <p className="success">{profileMessage}</p>}
            {profileStatus === 'loading' ? (
              <p className="muted">Chargement du profil...</p>
            ) : (
              <dl className="description-list">
                <div>
                  <dt>Exploitation</dt>
                  <dd>{profile.name || 'Non renseigné'}</dd>
                </div>
                <div>
                  <dt>Ville</dt>
                  <dd>{profile.city || 'Non renseigné'}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    <div>
                      {[profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
                        'Non renseigné'}
                    </div>
                    <div>{profile.phone || 'Non renseigné'}</div>
                  </dd>
                </div>
                <div>
                  <dt>SIRET</dt>
                  <dd>{profile.siret || 'Non renseigné'}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{profile.description || 'Ajoutez un texte de présentation.'}</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        <div className="card">
          <h2>Résumé public</h2>
          <dl className="description-list">
            <div>
              <dt>Contact</dt>
              <dd>
                <div>
                  {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Non renseigné'}
                </div>
                <div>{profile.phone || 'Non renseigné'}</div>
              </dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{profile.description || 'Ajoutez un texte de présentation.'}</dd>
            </div>
            <div>
              <dt>Ville</dt>
              <dd>{profile.city || 'Non renseigné'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="ads-manager">
        <header className="section-header">
          <div>
            <h2>Vos annonces produit</h2>
            <p>Publiez plusieurs lots : titre, catégorie, race et date de disponibilité « à partir de ».</p>
          </div>
        </header>

        <form className="form-card" onSubmit={handleAdSubmit}>
          <div className="form-grid-2">
            <label>
              Titre de l'annonce
              <input
                type="text"
                value={adForm.title}
                onChange={(event) => handleAdChange('title', event.target.value)}
                placeholder="Ex: Lots de laine disponibles"
                required
              />
            </label>
            <label>
              Ville
              <input
                type="text"
                value={adForm.city}
                onChange={(event) => handleAdChange('city', event.target.value)}
                placeholder="Ville"
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              rows="3"
              value={adForm.description}
              onChange={(event) => handleAdChange('description', event.target.value)}
              placeholder="Décrivez votre lot, la quantité, la période, etc."
            />
          </label>
          {adsError && <p className="error">{adsError}</p>}
          <div className="form-actions">
            <button type="submit" disabled={adsStatus === 'saving'}>
              {adsStatus === 'saving'
                ? 'Enregistrement...'
                : editingAdId
                  ? "Mettre à jour l'annonce"
                  : "Publier l'annonce"}
            </button>
            {editingAdId && (
              <button type="button" className="ghost" onClick={resetAdForm}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <h3>Annonces enregistrées</h3>
        {adsStatus === 'loading' ? (
          <p className="muted">Chargement des annonces...</p>
        ) : sortedAds.length ? (
          <ul className="card-list">
            {sortedAds.map((ad) => (
              <li key={ad.id} className="card">
                <div className="card__content">
                  <div className="eyebrow">Annonce producteur</div>
                  <h4>{ad.title}</h4>
                  <p>{ad.description || 'Pas de description.'}</p>
                  <p>Ville : {ad.city ?? 'Non renseignée'}</p>
                </div>
                <div className="card__actions">
                  <button type="button" className="ghost" onClick={() => startEditAd(ad)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleDeleteAd(ad.id)}
                    disabled={deletingAdId === ad.id}
                  >
                    {deletingAdId === ad.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Aucune annonce enregistrée pour le moment.</p>
        )}
      </section>
    </section>
  );
}

export default ProducerDashboard;
