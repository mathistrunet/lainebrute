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

const toDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceKm = (from, to) => {
  if (!from || !to) return null;
  const { lat: fromLat, lng: fromLng } = from;
  const { lat: toLat, lng: toLng } = to;
  if ([fromLat, fromLng, toLat, toLng].some((coord) => typeof coord !== 'number')) {
    return null;
  }
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c);
};

function AdsPage() {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [cityFilter, setCityFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [distanceMax, setDistanceMax] = useState('');
  const [referenceCity, setReferenceCity] = useState('');
  const [locationError, setLocationError] = useState('');
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

  const availableBreeds = useMemo(
    () => ['', ...new Set(ads.map((ad) => ad.sheep_breed).filter(Boolean))],
    [ads]
  );

  const cityLocations = useMemo(() => {
    const locations = new Map();
    ads.forEach((ad) => {
      const city = ad.city || ad.producer?.city;
      const lat = ad.producer?.lat;
      const lng = ad.producer?.lng;
      if (!city || typeof lat !== 'number' || typeof lng !== 'number') {
        return;
      }
      if (!locations.has(city)) {
        locations.set(city, { lat, lng });
      }
    });
    return locations;
  }, [ads]);

  const referenceLocation = useMemo(() => {
    if (!referenceCity) return null;
    return cityLocations.get(referenceCity.trim()) ?? null;
  }, [cityLocations, referenceCity]);

  useEffect(() => {
    if (!referenceCity) {
      setLocationError('');
      return;
    }
    if (!referenceLocation) {
      setLocationError('Ville inconnue ou sans coordonnées associées.');
      return;
    }
    setLocationError('');
  }, [referenceCity, referenceLocation]);

  const adsWithDistance = useMemo(() => {
    if (!referenceLocation) return ads;
    return ads.map((ad) => {
      const producerLocation = ad.producer?.lat && ad.producer?.lng
        ? { lat: ad.producer.lat, lng: ad.producer.lng }
        : null;
      const distanceKm = calculateDistanceKm(referenceLocation, producerLocation);
      return { ...ad, distanceKm };
    });
  }, [ads, referenceLocation]);

  const sortedAndFilteredAds = useMemo(() => {
    const minQuantityValue = minQuantity === '' ? null : Number(minQuantity);
    const minAvailabilityDate = toDateValue(availabilityStart);
    const maxAvailabilityDate = toDateValue(availabilityEnd);
    const maxDistanceValue = distanceMax === '' ? null : Number(distanceMax);

    const filtered = adsWithDistance.filter((ad) => {
      if (cityFilter && !(ad.city === cityFilter || ad.producer?.city === cityFilter)) {
        return false;
      }
      if (breedFilter && ad.sheep_breed !== breedFilter) {
        return false;
      }
      if (minQuantityValue !== null) {
        const quantity = Number(ad.quantity_kg);
        if (Number.isNaN(quantity) || quantity < minQuantityValue) {
          return false;
        }
      }
      const availabilityDate = toDateValue(ad.availability_date);
      if (minAvailabilityDate && (!availabilityDate || availabilityDate < minAvailabilityDate)) {
        return false;
      }
      if (maxAvailabilityDate && (!availabilityDate || availabilityDate > maxAvailabilityDate)) {
        return false;
      }
      if (maxDistanceValue !== null) {
        if (!referenceLocation || typeof ad.distanceKm !== 'number' || ad.distanceKm > maxDistanceValue) {
          return false;
        }
      }
      return true;
    });

    const sorter = sortBy === 'distance'
      ? (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
      : (a, b) => new Date(b.created_at) - new Date(a.created_at);

    return [...filtered].sort(sorter);
  }, [
    adsWithDistance,
    availabilityEnd,
    availabilityStart,
    breedFilter,
    cityFilter,
    distanceMax,
    minQuantity,
    sortBy,
    referenceLocation,
  ]);

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
        <label>
          Race de mouton
          <select value={breedFilter} onChange={(event) => setBreedFilter(event.target.value)}>
            {availableBreeds.map((breed) => (
              <option key={breed || 'all-breeds'} value={breed}>
                {breed || 'Toutes les races'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantité minimale (kg)
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Ex : 50"
            value={minQuantity}
            onChange={(event) => setMinQuantity(event.target.value)}
          />
        </label>
        <label>
          Date de disponibilité min
          <input
            type="date"
            value={availabilityStart}
            onChange={(event) => setAvailabilityStart(event.target.value)}
          />
        </label>
        <label>
          Date de disponibilité max
          <input
            type="date"
            value={availabilityEnd}
            onChange={(event) => setAvailabilityEnd(event.target.value)}
          />
        </label>
        <label>
          Distance maximale (km)
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Ex : 120"
            value={distanceMax}
            onChange={(event) => setDistanceMax(event.target.value)}
          />
        </label>
        <div className="filters-bar__location">
          <label htmlFor="reference-city">
            Ville pour le calcul de distance
            <input
              id="reference-city"
              type="text"
              placeholder="Ex : Toulouse"
              value={referenceCity}
              onChange={(event) => setReferenceCity(event.target.value)}
              list="reference-cities"
            />
          </label>
          <datalist id="reference-cities">
            {availableCities.filter(Boolean).map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {!referenceLocation && (sortBy === 'distance' || distanceMax !== '') ? (
            <span className="muted">Renseignez une ville pour trier ou filtrer par distance.</span>
          ) : null}
          {locationError ? <span className="error">{locationError}</span> : null}
        </div>
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
              <p>Disponibilité : {formatDate(ad.availability_date)}</p>
              <p>
                Quantité :{' '}
                {ad.quantity_kg !== null && ad.quantity_kg !== undefined
                  ? `${ad.quantity_kg} kg`
                  : 'Non renseignée'}
              </p>
              <p>
                Zone de livraison :{' '}
                {ad.delivery_radius_km !== null && ad.delivery_radius_km !== undefined
                  ? `${ad.delivery_radius_km} km`
                  : 'Non renseignée'}
              </p>
              <p>Race : {ad.sheep_breed || 'Non renseignée'}</p>
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
