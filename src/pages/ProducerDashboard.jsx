import { useMemo, useState } from 'react';

const defaultProfile = {
  contactEmail: 'contact@bergerie-des-alpes.fr',
  contactPhone: '+33 6 11 22 33 44',
  description:
    "Exploitation familiale spécialisée dans la laine brute française, avec un troupeau suivi en agriculture raisonnée.",
  website: 'https://bergerie-des-alpes.fr',
  availability: 'Accueil à la ferme sur rendez-vous du lundi au vendredi. Collecte de laine entre avril et juillet.',
};

const raceOptions = ['Mérinos', 'Solognote', 'Texel'];
const categoryOptions = ['Laine brute', 'Laine lavée'];

const initialAds = [
  {
    id: 1,
    title: 'Lots de laine blanche',
    category: 'Laine brute',
    race: 'Mérinos',
    availableFrom: '2024-06-01',
    status: 'Publié',
  },
  {
    id: 2,
    title: 'Laine noire issue de brebis Solognotes',
    category: 'Laine brute',
    race: 'Solognote',
    availableFrom: '2024-05-15',
    status: 'Brouillon',
  },
];

function ProducerDashboard() {
  const [profile, setProfile] = useState(defaultProfile);
  const [ads, setAds] = useState(initialAds);
  const [editingAdId, setEditingAdId] = useState(null);
  const [adForm, setAdForm] = useState({
    title: '',
    category: categoryOptions[0],
    race: raceOptions[0],
    availableFrom: '',
    status: 'Publié',
  });

  const sortedAds = useMemo(
    () => [...ads].sort((a, b) => new Date(a.availableFrom) - new Date(b.availableFrom)),
    [ads],
  );

  const handleProfileChange = (field, value) => {
    setProfile((previous) => ({ ...previous, [field]: value }));
  };

  const handleAdChange = (field, value) => {
    setAdForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleAdSubmit = (event) => {
    event.preventDefault();

    if (editingAdId) {
      setAds((previous) =>
        previous.map((ad) => (ad.id === editingAdId ? { ...ad, ...adForm } : ad)),
      );
    } else {
      const nextId = Math.max(0, ...ads.map((ad) => ad.id)) + 1;
      setAds((previous) => [...previous, { ...adForm, id: nextId }]);
    }

    setAdForm({ title: '', category: categoryOptions[0], race: raceOptions[0], availableFrom: '', status: 'Publié' });
    setEditingAdId(null);
  };

  const startEditAd = (ad) => {
    setEditingAdId(ad.id);
    setAdForm({
      title: ad.title,
      category: ad.category,
      race: ad.race,
      availableFrom: ad.availableFrom,
      status: ad.status,
    });
  };

  return (
    <section className="producer-dashboard">
      <h1>Espace producteur</h1>
      <p>Gérez vos informations publiques, vos disponibilités et vos annonces produits.</p>

      <div className="grid-2-cols">
        <form className="form-card" onSubmit={(event) => event.preventDefault()}>
          <h2>Coordonnées et présentation</h2>
          <label>
            Contact email
            <input
              type="email"
              value={profile.contactEmail}
              onChange={(event) => handleProfileChange('contactEmail', event.target.value)}
              placeholder="email@domaine.fr"
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              value={profile.contactPhone}
              onChange={(event) => handleProfileChange('contactPhone', event.target.value)}
              placeholder="06 xx xx xx xx"
            />
          </label>
          <label>
            Description de l'entreprise
            <textarea
              rows="3"
              value={profile.description}
              onChange={(event) => handleProfileChange('description', event.target.value)}
              placeholder="Expliquez votre élevage, vos pratiques..."
            />
          </label>
          <label>
            Site internet
            <input
              type="url"
              value={profile.website}
              onChange={(event) => handleProfileChange('website', event.target.value)}
              placeholder="https://votre-site.fr"
            />
          </label>
          <label>
            Horaires et périodes de disponibilité
            <textarea
              rows="3"
              value={profile.availability}
              onChange={(event) => handleProfileChange('availability', event.target.value)}
              placeholder="Ex: Lundi-vendredi, matin sur rendez-vous, enlèvements en juin."
            />
          </label>
          <p className="helper-text">Ces informations sont visibles sur votre page producteur.</p>
        </form>

        <div className="card">
          <h2>Résumé public</h2>
          <dl className="description-list">
            <div>
              <dt>Contact</dt>
              <dd>
                <div>{profile.contactEmail || 'Non renseigné'}</div>
                <div>{profile.contactPhone || 'Non renseigné'}</div>
              </dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{profile.description || 'Ajoutez un texte de présentation.'}</dd>
            </div>
            <div>
              <dt>Site web</dt>
              <dd>{profile.website || 'Pas de site communiqué.'}</dd>
            </div>
            <div>
              <dt>Disponibilités</dt>
              <dd>{profile.availability || 'Précisez vos périodes de contact.'}</dd>
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
                placeholder="Ex: Laine blanche récolte d'été"
                required
              />
            </label>
            <label>
              Disponibilité à partir du
              <input
                type="date"
                value={adForm.availableFrom}
                onChange={(event) => handleAdChange('availableFrom', event.target.value)}
                required
              />
            </label>
            <label>
              Catégorie
              <select
                value={adForm.category}
                onChange={(event) => handleAdChange('category', event.target.value)}
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Race
              <select value={adForm.race} onChange={(event) => handleAdChange('race', event.target.value)}>
                {raceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="inline-label">
            Statut
            <select value={adForm.status} onChange={(event) => handleAdChange('status', event.target.value)}>
              <option value="Publié">Publié</option>
              <option value="Brouillon">Brouillon</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit">{editingAdId ? 'Mettre à jour' : 'Publier l\'annonce'}</button>
            {editingAdId && (
              <button type="button" className="ghost" onClick={() => setEditingAdId(null)}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <h3>Annonces enregistrées</h3>
        <ul className="card-list">
          {sortedAds.map((ad) => (
            <li key={ad.id} className="card">
              <div className="card__content">
                <div className="eyebrow">{ad.category}</div>
                <h4>{ad.title}</h4>
                <p>Race : {ad.race}</p>
                <p>Disponible à partir du : {ad.availableFrom}</p>
                <p>Statut : {ad.status}</p>
              </div>
              <button type="button" className="ghost" onClick={() => startEditAd(ad)}>
                Modifier
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

export default ProducerDashboard;
