import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

const DEFAULT_CENTER = [46.7111, 1.7191];

const MapPage = () => {
  const [producers, setProducers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const listRefs = useRef(new Map());

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    api
      .getProducers()
      .then((data) => {
        if (!isMounted) return;
        setProducers(Array.isArray(data) ? data : []);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProducers([]);
        setStatus('error');
        setErrorMessage(error.message || "Impossible de charger les producteurs.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const validProducers = useMemo(
    () =>
      producers.filter(
        (producer) => Number.isFinite(producer?.lat) && Number.isFinite(producer?.lng)
      ),
    [producers]
  );

  const focusProducerOnMap = useCallback((producer) => {
    const leaflet = typeof window !== 'undefined' ? window.L : null;
    const map = mapInstanceRef.current;
    if (!leaflet || !map || !producer) {
      return;
    }

    const latLng = [producer.lat, producer.lng];
    if (!Number.isFinite(latLng[0]) || !Number.isFinite(latLng[1])) {
      return;
    }

    const targetZoom = Math.max(map.getZoom() || 6, 9);
    map.flyTo(latLng, targetZoom, { duration: 0.8 });
  }, []);

  const handleProducerSelection = useCallback(
    (producerId) => {
      setSelectedProducerId(producerId);
      setSidebarOpen(true);
      const producer = producers.find((entry) => entry.id === producerId);
      if (producer) {
        focusProducerOnMap(producer);
      }
    },
    [focusProducerOnMap, producers]
  );

  useEffect(() => {
    const leaflet = typeof window !== 'undefined' ? window.L : null;
    if (!leaflet || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const map = leaflet.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 6,
      zoomControl: true,
    });

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(map);

    markerLayerRef.current = leaflet.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      markerLayerRef.current = null;
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const leaflet = typeof window !== 'undefined' ? window.L : null;
    const map = mapInstanceRef.current;
    const markerLayer = markerLayerRef.current;
    if (!leaflet || !map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    if (validProducers.length === 0) {
      map.setView(DEFAULT_CENTER, 6);
      return;
    }

    const bounds = leaflet.latLngBounds([]);

    validProducers.forEach((producer) => {
      const marker = leaflet.circleMarker([producer.lat, producer.lng], {
        radius: 8,
        weight: 2,
        color: '#b91c1c',
        fillColor: '#dc2626',
        fillOpacity: 0.9,
        className: 'producer-marker',
      });
      marker.on('click', () => handleProducerSelection(producer.id));
      marker.addTo(markerLayer);
      bounds.extend([producer.lat, producer.lng]);
    });

    if (validProducers.length === 1) {
      map.setView(bounds.getCenter(), 10);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [handleProducerSelection, validProducers]);

  useEffect(() => {
    if (!sidebarOpen || !selectedProducerId) {
      return;
    }
    const target = listRefs.current.get(selectedProducerId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedProducerId, sidebarOpen]);

  const selectedProducer = producers.find((producer) => producer.id === selectedProducerId) || null;

  return (
    <section className="map-page" aria-label="Carte interactive des producteurs">
      <div className="map-layout">
        <div className="map-canvas" aria-live="polite">
          <div
            ref={mapContainerRef}
            className="map-canvas__inner"
            role="img"
            aria-label="Carte interactive des producteurs"
          ></div>
          {status === 'loading' && <p className="map-status">Chargement des producteurs...</p>}
          {status === 'error' && <p className="map-status error">{errorMessage}</p>}
          {status === 'success' && validProducers.length === 0 && (
            <p className="map-status">Aucun producteur géolocalisé n'est disponible pour le moment.</p>
          )}
        </div>

        <button
          type="button"
          className={`sidebar-toggle ${sidebarOpen ? 'is-open' : ''}`}
          onClick={() => setSidebarOpen((value) => !value)}
          aria-label={sidebarOpen ? 'Masquer la liste des producteurs' : 'Afficher la liste des producteurs'}
        >
          <span aria-hidden="true">{sidebarOpen ? '›' : '‹'}</span>
        </button>

        <aside className={`producer-panel ${sidebarOpen ? 'producer-panel--open' : ''}`} aria-live="polite">
          <div className="producer-panel__header">
            <div>
              <h3>Producteurs référencés</h3>
              <p>{producers.length} inscrit(s) sur la plateforme</p>
            </div>
          </div>

          {status === 'loading' && <p>Chargement des producteurs...</p>}
          {status === 'error' && <p className="error">{errorMessage}</p>}

          {status === 'success' && producers.length === 0 && (
            <p>Aucun producteur n'a encore été enregistré.</p>
          )}

          {producers.length > 0 && (
            <ul>
              {producers.map((producer) => (
                <li
                  key={producer.id}
                  ref={(node) => {
                    if (node) {
                      listRefs.current.set(producer.id, node);
                    } else {
                      listRefs.current.delete(producer.id);
                    }
                  }}
                  className={selectedProducerId === producer.id ? 'is-active' : ''}
                >
                  <button
                    className="producer-entry"
                    onClick={() => handleProducerSelection(producer.id)}
                  >
                    <span className="producer-entry__title">{producer.name}</span>
                    <span className="producer-entry__city">{producer.city || 'Ville non renseignée'}</span>
                    <span className="producer-entry__description">
                      {producer.description || 'Description à venir.'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedProducer && (
            <div className="producer-highlight">
              <h4>Producteur sélectionné</h4>
              <p>
                <strong>{selectedProducer.name}</strong>
                <br />
                {selectedProducer.city || 'Ville non renseignée'}
              </p>
              <p>{selectedProducer.description || 'Description à venir.'}</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default MapPage;
