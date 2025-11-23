import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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

function AdsPage() {
  const [sortBy, setSortBy] = useState('date');
  const [cityFilter, setCityFilter] = useState('');

  const availableCities = useMemo(
    () => ['', ...new Set(mockAds.map((ad) => ad.city))],
    [],
  );

  const sortedAndFilteredAds = useMemo(() => {
    const filtered = mockAds.filter((ad) => (cityFilter ? ad.city === cityFilter : true));

    const sorter = sortBy === 'distance'
      ? (a, b) => a.distanceKm - b.distanceKm
      : (a, b) => new Date(a.availableFrom) - new Date(b.availableFrom);

    return [...filtered].sort(sorter);
  }, [cityFilter, sortBy]);

  return (
    <section>
      <h1>Annonces</h1>
      <p>
        Consultez toutes les annonces publiées par les producteurs : titres, catégories « laine », race, et
        dates de disponibilité à partir d'une période donnée.
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
              Producteur : {ad.producer} — {ad.city} ({ad.distanceKm} km)
            </p>
            <Link to="/producteur" className="ghost">
              Voir la page du producteur
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdsPage;
