import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import { SimpleMap } from '../lib/simpleMap.js';
import { api } from '../api.js';
import ReportDialog from '../components/ReportDialog.jsx';

const fallbackProducers = [
  {
    id: 'p-1',
    name: 'Ferme de la Crau',
    city: 'Salon-de-Provence',
    lat: 43.6393,
    lng: 5.0973,
    quantity: '180 kg de laine mérinos',
  },
  {
    id: 'p-2',
    name: 'Laine du Vent',
    city: 'Rennes',
    lat: 48.1173,
    lng: -1.6778,
    quantity: '80 kg de laine cardée',
  },
  {
    id: 'p-3',
    name: 'Bergerie du Nord',
    city: 'Arras',
    lat: 50.2910,
    lng: 2.7775,
    quantity: '250 kg laine noire brute',
  },
  {
    id: 'p-4',
    name: 'Collectif Massif Central',
    city: 'Clermont-Ferrand',
    lat: 45.7772,
    lng: 3.0870,
    quantity: 'Plusieurs lots disponibles',
  },
];

const cityCoordinates = {
  Lyon: { lat: 45.764, lng: 4.8357 },
  'Clermont-Ferrand': { lat: 45.7772, lng: 3.0870 },
  Grenoble: { lat: 45.1885, lng: 5.7245 },
};

const resolveProducerCoordinates = (producer) => {
  if (!producer) return null;
  if (Number.isFinite(producer.lat) && Number.isFinite(producer.lng)) {
    return { lat: producer.lat, lng: producer.lng };
  }
  const city = producer.city?.trim();
  if (city && cityCoordinates[city]) {
    return cityCoordinates[city];
  }
  return null;
};

function MapPage() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [producers, setProducers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [activeProducerId, setActiveProducerId] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportDefaultCategory, setReportDefaultCategory] = useState('producer');
  const [offerProducerIds, setOfferProducerIds] = useState(() => new Set());

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;
    mapRef.current = new SimpleMap(mapContainerRef.current, {
      center: [46.6, 2.2],
      zoom: 6,
      minZoom: 4,
      maxZoom: 12,
    });

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(nextLocation);
          mapRef.current?.flyTo([nextLocation.lat, nextLocation.lng], 7);
        },
        (geoError) => {
          console.warn('Impossible de récupérer la géolocalisation', geoError);
        },
        { maximumAge: 5 * 60 * 1000, timeout: 8000 }
      );
    }
    return () => mapRef.current?.destroy();
  }, []);

  useEffect(() => {
    const loadProducers = async () => {
      setStatus('loading');
      setError('');
      try {
        const data = await api.getProducers();
        if (Array.isArray(data) && data.length > 0) {
          setProducers(data);
        } else {
          setProducers(fallbackProducers);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setProducers(fallbackProducers);
        setError('Impossible de récupérer la liste des producteurs en ligne.');
      } finally {
        setStatus('idle');
      }
    };

    loadProducers();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadOffers = async () => {
      try {
        const offers = await api.getOffers();
        if (!Array.isArray(offers)) return;
        const ids = new Set(
          offers
            .map((offer) => offer?.producer_id ?? offer?.producer?.id)
            .filter((id) => id !== null && id !== undefined)
            .map((id) => String(id))
        );
        if (isMounted) {
          setOfferProducerIds(ids);
        }
      } catch (fetchError) {
        console.error(fetchError);
      }
    };

    loadOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  const markers = useMemo(
    () =>
      producers
        .map((producer) => {
          const coordinates = resolveProducerCoordinates(producer);
          if (!coordinates) return null;
          const markerId = producer.id ?? `${coordinates.lat}:${coordinates.lng}`;
          const markerIdKey = markerId !== null && markerId !== undefined ? String(markerId) : null;
          return {
            id: markerIdKey ?? `${coordinates.lat}:${coordinates.lng}`,
            name: producer.name ?? producer.title ?? 'Producteur',
            city: producer.city,
            lat: coordinates.lat,
            lng: coordinates.lng,
            quantity: producer.quantity,
            status: producer.status,
            hasAds: markerIdKey ? offerProducerIds.has(markerIdKey) : false,
          };
        })
        .filter(Boolean),
    [producers, offerProducerIds]
  );

  const focusOnProducer = useCallback(
    (producer) => {
      if (!producer || !mapRef.current) return;
      setActiveProducerId(producer.id);
      mapRef.current.flyTo([producer.lat, producer.lng], 9);
    },
    []
  );

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMarkers(markers, {
      onMarkerSelect: (marker) => focusOnProducer(marker),
      activeId: activeProducerId,
    });

    if (markers.length > 0 && !activeProducerId) {
      const points = [...markers];
      if (userLocation) {
        points.push({ id: 'user', lat: userLocation.lat, lng: userLocation.lng });
      }
      const bounds = points.reduce(
        (acc, marker) => ({
          minLat: Math.min(acc.minLat, marker.lat),
          maxLat: Math.max(acc.maxLat, marker.lat),
          minLng: Math.min(acc.minLng, marker.lng),
          maxLng: Math.max(acc.maxLng, marker.lng),
        }),
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );
      mapRef.current.fitBounds(bounds, { padding: 72 });
    } else if (userLocation && !activeProducerId) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 7);
    }
  }, [markers, activeProducerId, focusOnProducer, userLocation]);

  const handleLocate = (producer) => focusOnProducer(producer);

  const openReportDialog = (producer, defaultCategory = 'producer') => {
    setReportContext({
      type: 'producer',
      id: producer.id,
      name: producer.name,
      city: producer.city,
    });
    setReportDefaultCategory(defaultCategory);
    setIsReportOpen(true);
  };

  const handleCitySelect = (city) => {
    setSearchValue(city.label);
    if (city.lat && city.lng && mapRef.current) {
      mapRef.current.flyTo([city.lat, city.lng], 9);
    }
  };

  const handleUserRecenter = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 8);
    } else if (mapRef.current) {
      mapRef.current.flyTo([46.6, 2.2], 6);
    }
  };

  const handleShowAll = () => {
    if (!mapRef.current || markers.length === 0) return;
    const bounds = markers.reduce(
      (acc, marker) => ({
        minLat: Math.min(acc.minLat, marker.lat),
        maxLat: Math.max(acc.maxLat, marker.lat),
        minLng: Math.min(acc.minLng, marker.lng),
        maxLng: Math.max(acc.maxLng, marker.lng),
      }),
      { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
    );
    mapRef.current.fitBounds(bounds, { padding: 80 });
  };

  const activeProducer = useMemo(
    () => markers.find((producer) => producer.id === activeProducerId),
    [markers, activeProducerId]
  );

  return (
    <section className="map-page">
      <div className="map-page__header">
        <h1>Carte interactive des producteurs</h1>
        <div className="map-page__search">
          <CityAutocomplete
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onSelect={handleCitySelect}
            placeholder="Rechercher une commune"
          />
        </div>
      </div>

      <div className="map-shell">
        <div className="map-layout">
          <div ref={mapContainerRef} className="map-canvas" aria-label="Carte des producteurs" />
          <aside className="map-info-panel" aria-label="Actions et fiche producteur">
            <div className="map-shell__actions">
              <button type="button" className="ghost" onClick={handleUserRecenter}>
                Recentrer sur ma position
              </button>
              <button type="button" className="ghost" onClick={handleShowAll}>
                Afficher tous les producteurs
              </button>
            </div>
            {activeProducer && (
              <div className="producer-detail-card">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => openReportDialog(activeProducer)}
                  aria-label={`Signaler ${activeProducer.name}`}
                  title="Signaler"
                >
                  ⚑
                </button>
                <p className="eyebrow">Fiche producteur</p>
                <h3>{activeProducer.name}</h3>
                {activeProducer.city && <p className="muted">{activeProducer.city}</p>}
                {activeProducer.quantity && <p>{activeProducer.quantity}</p>}
                <div className="producer-detail-card__badges">
                  <span className="badge">
                    {activeProducer.hasAds ? 'Annonces disponibles' : 'Sans annonce'}
                  </span>
                  {activeProducer.status && <span className="badge">{activeProducer.status}</span>}
                </div>
                <div className="producer-detail-card__actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleLocate(activeProducer)}
                  >
                    Recentrer
                  </button>
                </div>
              </div>
            )}
          </aside>
          <div className="map-legend">
            <p className="eyebrow">Statut des producteurs</p>
            <ul>
              <li><span className="dot" /> Producteur</li>
              <li><span className="dot dot--has-ads" /> Producteur avec annonces</li>
            </ul>
            {status === 'loading' && <small className="muted">Chargement des producteurs...</small>}
            {error && <small className="error">{error}</small>}
          </div>
        </div>
      </div>
      <ReportDialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        context={reportContext}
        defaultCategory={reportDefaultCategory}
      />
    </section>
  );
}

export default MapPage;
