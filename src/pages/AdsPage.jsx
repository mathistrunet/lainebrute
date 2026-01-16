import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReportDialog from '../components/ReportDialog.jsx';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
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

const normalizeDepartment = (department) => {
  if (!department?.code || !department?.nom) {
    return null;
  }
  return {
    code: department.code,
    name: department.nom,
    label: `${department.code} - ${department.nom}`,
  };
};

const getDepartmentKey = (ad) => {
  const lat = ad.producer?.lat;
  const lng = ad.producer?.lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `coords:${lat.toFixed(4)},${lng.toFixed(4)}`;
  }
  const city = ad.city || ad.producer?.city;
  if (city) {
    return `city:${city.trim().toLowerCase()}`;
  }
  return null;
};

const fetchDepartmentForAd = async ({ lat, lng, city }) => {
  let url = '';
  if (typeof lat === 'number' && typeof lng === 'number') {
    url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lng}&fields=departement&format=json&limit=1`;
  } else if (city) {
    const query = encodeURIComponent(city.trim());
    url = `https://geo.api.gouv.fr/communes?nom=${query}&fields=departement&limit=1&boost=population`;
  }
  if (!url) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return normalizeDepartment(data?.[0]?.departement);
  } catch (error) {
    return null;
  }
};

function AdsPage() {
  const adsPerPage = 30;
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [distanceMax, setDistanceMax] = useState('');
  const [referenceCity, setReferenceCity] = useState('');
  const [referenceLocation, setReferenceLocation] = useState(null);
  const [departmentLookup, setDepartmentLookup] = useState({});
  const [locationError, setLocationError] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [visibleCount, setVisibleCount] = useState(adsPerPage);

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

  const availableBreeds = useMemo(
    () => ['', ...new Set(ads.map((ad) => ad.sheep_breed).filter(Boolean))],
    [ads]
  );

  useEffect(() => {
    let isMounted = true;
    const pending = [];
    const seenKeys = new Set();
    ads.forEach((ad) => {
      const key = getDepartmentKey(ad);
      if (!key || departmentLookup[key] || seenKeys.has(key)) {
        return;
      }
      seenKeys.add(key);
      pending.push({
        key,
        lat: ad.producer?.lat,
        lng: ad.producer?.lng,
        city: ad.city || ad.producer?.city,
      });
    });
    if (pending.length === 0) {
      return undefined;
    }
    Promise.all(
      pending.map(async (entry) => ({
        key: entry.key,
        department: await fetchDepartmentForAd(entry),
      }))
    ).then((results) => {
      if (!isMounted) return;
      setDepartmentLookup((prev) => {
        const next = { ...prev };
        results.forEach(({ key, department }) => {
          if (department) {
            next[key] = department;
          }
        });
        return next;
      });
    });
    return () => {
      isMounted = false;
    };
  }, [ads, departmentLookup]);

  const adsWithDepartment = useMemo(
    () =>
      ads.map((ad) => {
        const key = getDepartmentKey(ad);
        const department = key ? departmentLookup[key] : null;
        return { ...ad, department };
      }),
    [ads, departmentLookup]
  );

  const availableDepartments = useMemo(() => {
    const departmentsByCode = new Map();
    adsWithDepartment.forEach((ad) => {
      if (!ad.department?.code || departmentsByCode.has(ad.department.code)) {
        return;
      }
      departmentsByCode.set(ad.department.code, ad.department);
    });
    const sorted = [...departmentsByCode.values()].sort((a, b) =>
      a.code.localeCompare(b.code, 'fr', { numeric: true })
    );
    return [{ code: '', label: 'Tous les départements' }, ...sorted];
  }, [adsWithDepartment]);

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
    if (!referenceLocation) return adsWithDepartment;
    return adsWithDepartment.map((ad) => {
      const producerLocation = ad.producer?.lat && ad.producer?.lng
        ? { lat: ad.producer.lat, lng: ad.producer.lng }
        : null;
      const distanceKm = calculateDistanceKm(referenceLocation, producerLocation);
      return { ...ad, distanceKm };
    });
  }, [adsWithDepartment, referenceLocation]);

  const sortedAndFilteredAds = useMemo(() => {
    const minQuantityValue = minQuantity === '' ? null : Number(minQuantity);
    const minAvailabilityDate = toDateValue(availabilityStart);
    const maxAvailabilityDate = toDateValue(availabilityEnd);
    const maxDistanceValue = distanceMax === '' ? null : Number(distanceMax);

    const filtered = adsWithDistance.filter((ad) => {
      if (departmentFilter && ad.department?.code !== departmentFilter) {
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
    departmentFilter,
    distanceMax,
    minQuantity,
    sortBy,
    referenceLocation,
  ]);

  useEffect(() => {
    setVisibleCount(adsPerPage);
  }, [
    adsPerPage,
    ads.length,
    availabilityEnd,
    availabilityStart,
    breedFilter,
    departmentFilter,
    distanceMax,
    minQuantity,
    referenceCity,
    sortBy,
  ]);

  const filteredCount = sortedAndFilteredAds.length;
  const visibleAds = useMemo(
    () => sortedAndFilteredAds.slice(0, visibleCount),
    [sortedAndFilteredAds, visibleCount]
  );

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
        <div className="filters-bar__group">
          <label>
            Trier par
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date">Annonces les plus récentes</option>
              <option value="distance">Distance croissante</option>
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
        </div>
        <div className="filters-bar__group filters-bar__group--geo">
          <label>
            Département de référence
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              {availableDepartments.map((department) => (
                <option key={department.code || 'all'} value={department.code}>
                  {department.label}
                </option>
              ))}
            </select>
          </label>
          <div className="filters-bar__location">
            <CityAutocomplete
              label="Ville de référence pour calculer une distance"
              name="reference-city"
              value={referenceCity}
              placeholder="Ex : Toulouse"
              onChange={(event) => {
                setReferenceCity(event.target.value);
                setReferenceLocation(null);
              }}
              onSelect={(selection) => {
                setReferenceCity(selection.label);
                if (typeof selection.lat === 'number' && typeof selection.lng === 'number') {
                  setReferenceLocation({ lat: selection.lat, lng: selection.lng });
                } else {
                  setReferenceLocation(null);
                }
              }}
            />
            {!referenceLocation && (sortBy === 'distance' || distanceMax !== '') ? (
              <span className="muted">Renseignez une ville pour trier ou filtrer par distance.</span>
            ) : null}
            {locationError ? <span className="error">{locationError}</span> : null}
          </div>
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
        </div>
      </div>

      {isLoading ? (
        <p>Chargement des annonces...</p>
      ) : errorMessage ? (
        <p className="error">{errorMessage}</p>
      ) : (
        <>
          <p className="muted">
            {filteredCount} annonce{filteredCount > 1 ? 's' : ''} correspond{filteredCount > 1 ? 'ent' : ''} à votre
            recherche.
          </p>
          <ul className="card-list">
            {visibleAds.map((ad) => (
              <li key={ad.id} className="card ad-card">
                <div className="ad-card__media">
                  {ad.photo_url ? (
                    <img src={ad.photo_url} alt={ad.title} loading="lazy" />
                  ) : (
                    <span className="ad-card__placeholder">Photo à venir</span>
                  )}
                </div>
                <div className="ad-card__content">
                  <div className="eyebrow">Annonce producteur</div>
                  <div className="ad-card__header">
                    <h2>{ad.title}</h2>
                    <span className="ad-card__published">Publié le {formatDate(ad.created_at)}</span>
                  </div>
                  <p className="ad-card__description">{ad.description || 'Pas de description fournie.'}</p>
                  <dl className="ad-card__details">
                    <div>
                      <dt>Disponibilité</dt>
                      <dd>{formatDate(ad.availability_date)}</dd>
                    </div>
                    <div>
                      <dt>Quantité</dt>
                      <dd>
                        {ad.quantity_kg !== null && ad.quantity_kg !== undefined
                          ? `${ad.quantity_kg} kg`
                          : 'Non renseignée'}
                      </dd>
                    </div>
                    <div>
                      <dt>Zone de livraison</dt>
                      <dd>
                        {ad.delivery_radius_km !== null && ad.delivery_radius_km !== undefined
                          ? `${ad.delivery_radius_km} km`
                          : 'Non renseignée'}
                      </dd>
                    </div>
                    <div>
                      <dt>Race</dt>
                      <dd>{ad.sheep_breed || 'Non renseignée'}</dd>
                    </div>
                    <div>
                      <dt>Producteur</dt>
                      <dd>
                        {ad.producer?.name ?? 'Producteur'} —{' '}
                        {ad.producer?.city ?? ad.city ?? 'Ville inconnue'}
                        {typeof ad.distanceKm === 'number' ? ` (${ad.distanceKm} km)` : ''}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="ad-card__actions">
                  <button type="button" className="ghost" onClick={() => openReportDialog(ad)}>
                    Signaler
                  </button>
                  {ad.producer?.id ? (
                    <Link to={`/producteurs/${ad.producer.id}`} className="ghost">
                      Voir la page du producteur
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {visibleCount < filteredCount ? (
            <button
              type="button"
              className="ghost"
              onClick={() => setVisibleCount((count) => count + adsPerPage)}
            >
              Afficher 30 annonces supplémentaires
            </button>
          ) : null}
        </>
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
