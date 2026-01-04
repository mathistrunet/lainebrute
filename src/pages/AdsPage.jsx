import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReportDialog from '../components/ReportDialog.jsx';
import { api } from '../api.js';

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('fr-FR');
};

function AdsPage() {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [cityFilter, setCityFilter] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');
    api
      .getOffers()
      .then((offers) => {
        if (!isMounted) return;
        setAds(Array.isArray(offers) ? offers : []);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error?.message ?? 'Impossible de charger les annonces.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const availableCities = useMemo(
    () => ['', ...new Set(ads.map((ad) => ad.city || ad.producer?.city).filter(Boolean))],
    [ads]
  );

  const sortedAndFilteredAds = useMemo(() => {
    const filtered = ads.filter((ad) => {
      if (!cityFilter) return true;
      return ad.city === cityFilter || ad.producer?.city === cityFilter;
    });

    const sorter = sortBy === 'distance'
      ? (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      : (a, b) => new Date(b.created_at) - new Date(a.created_at);

    return [...filtered].sort(sorter);
  }, [ads, cityFilter, sortBy]);

  const openReportDialog = (ad) => {
    setReportContext({
      type: 'ad',
      id: ad.id,
      title: ad.title,
      producer: ad.producer ?? null,
      city: ad.city ?? ad.producer?.city ?? null,
    });
    setIsReportOpen(true);
  };

  return (
    <section>
      <h1>Annonces</h1>
      <p>
        Retrouvez toutes les propositions de vente de laine : une annonce correspond à un type de laine
        pour une exploitation. Chaque producteur peut donc publier plusieurs annonces.
      </p>

      <div className="filters-bar">
        <label>
          Trier par
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="date">Annonces les plus récentes</option>
            <option value="distance">Distance croissante</option>
          </select>
        </label>
        <label>
          Ville de référence
          <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
            {availableCities.map((city) => (
              <option key={city || 'all'} value={city}>
                {city || 'Toutes les villes'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p>Chargement des annonces...</p>
      ) : errorMessage ? (
        <p className="error">{errorMessage}</p>
      ) : (
        <ul className="card-list">
          {sortedAndFilteredAds.map((ad) => (
            <li key={ad.id} className="card">
              <div className="eyebrow">Annonce producteur</div>
              <h2>{ad.title}</h2>
              <p>{ad.description || 'Pas de description fournie.'}</p>
              <p>Publié le : {formatDate(ad.created_at)}</p>
              <p>
                Producteur : {ad.producer?.name ?? 'Producteur'} — {ad.producer?.city ?? ad.city ?? 'Ville inconnue'}
                {typeof ad.distanceKm === 'number' ? ` (${ad.distanceKm} km)` : ''}
              </p>
              <div className="card__actions">
                <button type="button" className="ghost" onClick={() => openReportDialog(ad)}>
                  Signaler
                </button>
              </div>
              {ad.producer?.id ? (
                <Link to={`/producteurs/${ad.producer.id}`} className="ghost">
                  Voir la page du producteur
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        context={reportContext}
        defaultCategory="ad"
      />
    </section>
  );
}

export default AdsPage;
