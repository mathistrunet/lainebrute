import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReportDialog from '../components/ReportDialog.jsx';

const mockAds = [
  {
    id: 1,
    title: 'Lots de laine blanche',
    description: 'Disponible en ballots de 40kg, laine brute non lavée.',
    category: 'Laine (liste extensible)',
    race: 'Mérinos',
    availableFrom: '2024-06-01',
    city: 'Lyon',
    distanceKm: 18,
    producer: 'Bergerie des Alpes',
  },
  {
    id: 2,
    title: 'Laine noire issue de brebis Solognotes',
    description: 'Parfaite pour filature artisanale, récolte printemps.',
    category: 'Laine (liste extensible)',
    race: 'Solognote',
    availableFrom: '2024-05-15',
    city: 'Clermont-Ferrand',
    distanceKm: 72,
    producer: 'Ferme du Vent',
  },
  {
    id: 3,
    title: 'Laine lavée pour ateliers',
    description: 'Race Texel, mise à disposition en sacs de 10kg.',
    category: 'Laine (liste extensible)',
    race: 'Texel',
    availableFrom: '2024-07-10',
    city: 'Grenoble',
    distanceKm: 55,
    producer: 'Atelier des Cimes',
  },
];
import { ads, producers } from '../data/marketData.js';

function AdsPage() {
  const [sortBy, setSortBy] = useState('date');
  const [cityFilter, setCityFilter] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);

  const producerById = useMemo(
    () => new Map(producers.map((producer) => [producer.id, producer])),
    []
  );

  const availableCities = useMemo(
    () => ['', ...new Set(ads.map((ad) => ad.city).filter(Boolean))],
    []
  );

  const sortedAndFilteredAds = useMemo(() => {
    const filtered = ads.filter((ad) => (cityFilter ? ad.city === cityFilter : true));

    const sorter = sortBy === 'distance'
      ? (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      : (a, b) => new Date(a.availableFrom) - new Date(b.availableFrom);

    return [...filtered]
      .map((ad) => ({ ...ad, producer: producerById.get(ad.producerId) }))
      .sort(sorter);
  }, [cityFilter, sortBy, producerById]);

  const openReportDialog = (ad) => {
    setReportContext({
      type: 'ad',
      id: ad.id,
      title: ad.title,
      producer: ad.producer,
      city: ad.city,
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
            <option value="date">Disponibilité la plus proche</option>
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

      <ul className="card-list">
        {sortedAndFilteredAds.map((ad) => (
          <li key={ad.id} className="card">
            <div className="eyebrow">{ad.category}</div>
            <h2>{ad.title}</h2>
            <p>{ad.description}</p>
            <p>Race : {ad.race}</p>
            <p>Disponible à partir du : {ad.availableFrom}</p>
            <p>
              Producteur : {ad.producer?.name ?? 'Producteur'} — {ad.producer?.city ?? ad.city}
              {typeof ad.distanceKm === 'number' ? ` (${ad.distanceKm} km)` : ''}
            </p>
            <div className="card__actions">
              <button type="button" className="ghost" onClick={() => openReportDialog(ad)}>
                Signaler
              </button>
            </div>
            <Link to={`/producteurs/${ad.producerId}`} className="ghost">
              Voir la page du producteur
            </Link>
          </li>
        ))}
      </ul>
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
