import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import { SimpleMap } from '../lib/simpleMap.js';
import { api } from '../api.js';

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
  const highlightTimeoutRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return undefined;
    mapRef.current = new SimpleMap(mapContainerRef.current, {
      center: [46.6, 2.2],
      zoom: 6,
      minZoom: 4,
      maxZoom: 12,
    });
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
        .filter((producer) => Number.isFinite(producer?.lat) && Number.isFinite(producer?.lng))
        .map((producer) => ({
          id: producer.id ?? `${producer.lat}:${producer.lng}`,
          name: producer.name ?? producer.title ?? 'Producteur',
          city: producer.city,
          lat: producer.lat,
          lng: producer.lng,
          quantity: producer.quantity,
          status: producer.status,
        })),
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
      const bounds = markers.reduce(
        (acc, marker) => ({
          minLat: Math.min(acc.minLat, marker.lat),
          maxLat: Math.max(acc.maxLat, marker.lat),
          minLng: Math.min(acc.minLng, marker.lng),
          maxLng: Math.max(acc.maxLng, marker.lng),
        }),
        { minLat: 90, maxLat: -90, minLng: 180, maxLng: -180 }
      );
      mapRef.current.fitBounds(bounds, { padding: 64 });
    }
  }, [markers, activeProducerId, focusOnProducer]);

  const handleLocate = (producer) => focusOnProducer(producer);

  const handleCitySelect = (city) => {
    setSearchValue(city.label);
    if (city.lat && city.lng && mapRef.current) {
      mapRef.current.flyTo([city.lat, city.lng], 9);
    }
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
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

export default MapPage;
