import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ads, producers } from '../data/marketData.js';

function AdsPage() {
  const [sortBy, setSortBy] = useState('date');
  const [cityFilter, setCityFilter] = useState('');

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
            <Link to={`/producteurs/${ad.producerId}`} className="ghost">
              Voir la page du producteur
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdsPage;
