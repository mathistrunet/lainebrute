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
  const [highlightedProducerId, setHighlightedProducerId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContext, setReportContext] = useState(null);
  const [reportDefaultCategory, setReportDefaultCategory] = useState('producer');
  const highlightTimeoutRef = useRef(null);
  const itemRefs = useRef(new Map());

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

  const markers = useMemo(
    () =>
      producers
        .map((producer) => {
          const coordinates = resolveProducerCoordinates(producer);
          if (!coordinates) return null;
          return {
            id: producer.id ?? `${coordinates.lat}:${coordinates.lng}`,
            name: producer.name ?? producer.title ?? 'Producteur',
            city: producer.city,
            lat: coordinates.lat,
            lng: coordinates.lng,
            quantity: producer.quantity,
            status: producer.status,
          };
        })
        .filter(Boolean),
    [producers]
  );

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    },
    []
  );

  const triggerHighlight = useCallback((producerId) => {
    if (!producerId) return;
    setHighlightedProducerId(producerId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedProducerId(null);
    }, 1600);
  }, []);

  const focusOnProducer = useCallback(
    (producer) => {
      if (!producer || !mapRef.current) return;
      setActiveProducerId(producer.id);
      setIsPanelOpen(true);
      triggerHighlight(producer.id);
      mapRef.current.flyTo([producer.lat, producer.lng], 9);
    },
    [triggerHighlight]
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

  const registerItemRef = useCallback((id) => (node) => {
    if (!itemRefs.current) return;
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!activeProducerId) return;
    const node = itemRefs.current.get(activeProducerId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeProducerId]);

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

  return (
    <section className="map-page">
      <div className="map-page__header">
        <div>
          <h1>Carte interactive des producteurs</h1>
          <p>
            Visualisez les producteurs de laine brute partout en France, explorez leurs lots et
            localisez vos partenaires en un clic.
          </p>
        </div>
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
        <div className="map-shell__toolbar">
          <div>
            <p className="eyebrow">Navigation</p>
            <p className="muted">
              Glissez pour vous déplacer, utilisez la molette pour zoomer et survolez un point pour
              afficher les détails d&apos;un producteur.
            </p>
          </div>
          <div className="map-shell__actions">
            <button type="button" className="ghost" onClick={handleUserRecenter}>
              Recentrer sur ma position
            </button>
            <button type="button" className="ghost" onClick={handleShowAll}>
              Afficher tous les producteurs
            </button>
          </div>
        </div>

        <div className="map-layout">
          <div ref={mapContainerRef} className="map-canvas" aria-label="Carte des producteurs" />
          <button
            type="button"
            className="map-panel-toggle"
            onClick={() => setIsPanelOpen((open) => !open)}
            aria-expanded={isPanelOpen}
            aria-controls="producer-panel"
          >
            {isPanelOpen ? 'Masquer la liste' : 'Voir la liste des producteurs'}
          </button>
          <div className="map-legend">
            <p className="eyebrow">Statut</p>
            <ul>
              <li><span className="dot dot--primary" /> Producteur actif</li>
              <li><span className="dot" /> Autres annonces</li>
            </ul>
            {status === 'loading' && <small className="muted">Chargement des producteurs...</small>}
            {error && <small className="error">{error}</small>}
          </div>
          <aside
            id="producer-panel"
            className={`map-side-panel ${isPanelOpen ? 'is-open' : ''}`}
            aria-label="Liste des producteurs"
          >
            <div className="map-side-panel__header">
              <div>
                <p className="eyebrow">Producteurs référencés</p>
                <h2>Liste des producteurs</h2>
                <p className="muted">
                  Cliquez sur un point de la carte pour ouvrir le détail du producteur et le
                  sélectionner dans la liste.
                </p>
              </div>
              <button type="button" className="ghost" onClick={() => setIsPanelOpen(false)}>
                Fermer
              </button>
            </div>
            <ul className="card-list map-side-panel__list">
              {markers.map((producer) => (
                <li
                  key={producer.id}
                  ref={registerItemRef(producer.id)}
                  className={`card ${
                    producer.id === activeProducerId ? 'is-active' : ''
                  } ${producer.id === highlightedProducerId ? 'is-highlighted' : ''}`}
                >
                  <div>
                    <strong>{producer.name}</strong>
                    {producer.city && <p className="muted">{producer.city}</p>}
                    {producer.quantity && <p>{producer.quantity}</p>}
                  </div>
                  <div className="card__actions">
                    <button type="button" className="ghost" onClick={() => handleLocate(producer)}>
                      Localiser
                    </button>
                    <button type="button" className="ghost" onClick={() => openReportDialog(producer)}>
                      Signaler
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => openReportDialog(producer, 'claim')}
                    >
                      Revendiquer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
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
