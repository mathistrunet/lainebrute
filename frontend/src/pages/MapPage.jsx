import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { SimpleMap } from '../lib/simpleMap.js';

const DEFAULT_CENTER = [46.7111, 1.7191];

const MapPage = () => {
  const [producers, setProducers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
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
    const map = mapInstanceRef.current;
    if (!map || !producer) {
      return;
    }

    const latLng = [producer.lat, producer.lng];
    if (!Number.isFinite(latLng[0]) || !Number.isFinite(latLng[1])) {
      return;
    }

    const targetZoom = Math.max(map.getZoom() || 6, 9);
    map.flyTo(latLng, targetZoom);
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

  const markerData = useMemo(
    () =>
      validProducers.map((producer) => ({
        id: producer.id,
        lat: producer.lat,
        lng: producer.lng,
        name: producer.name,
        city: producer.city,
      })),
    [validProducers]
  );

  const markerBounds = useMemo(() => {
    if (markerData.length === 0) {
      return null;
    }
    return markerData.reduce(
      (acc, marker) => ({
        minLat: Math.min(acc.minLat, marker.lat),
        maxLat: Math.max(acc.maxLat, marker.lat),
        minLng: Math.min(acc.minLng, marker.lng),
        maxLng: Math.max(acc.maxLng, marker.lng),
      }),
      {
        minLat: markerData[0].lat,
        maxLat: markerData[0].lat,
        minLng: markerData[0].lng,
        maxLng: markerData[0].lng,
      }
    );
  }, [markerData]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      const map = new SimpleMap(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 6,
        minZoom: 3,
        maxZoom: 12,
      });
      mapInstanceRef.current = map;
      setMapReady(true);
      setMapError(null);

      return () => {
        map.destroy();
        mapInstanceRef.current = null;
        setMapReady(false);
      };
    } catch (error) {
      console.error("Impossible d'initialiser la carte", error);
      setMapError("Impossible d'afficher la carte interactive.");
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map) {
      return;
    }

    map.setMarkers(markerData, {
      activeId: selectedProducerId,
      onMarkerSelect: (marker) => handleProducerSelection(marker.id),
    });
  }, [handleProducerSelection, mapReady, markerData, selectedProducerId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map) {
      return;
    }

    if (markerData.length === 0) {
      map.setView(DEFAULT_CENTER, 6);
      return;
    }

    if (markerData.length === 1) {
      const marker = markerData[0];
      map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 9));
      return;
    }

    if (markerBounds) {
      map.fitBounds(markerBounds, { padding: 56 });
    }
  }, [mapReady, markerBounds, markerData]);

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
          {!mapReady && !mapError && (
            <p className="map-status">Chargement de la carte...</p>
          )}
          {mapError && <p className="map-status error">{mapError}</p>}
          {mapReady && status === 'loading' && (
            <p className="map-status">Chargement des producteurs...</p>
          )}
          {mapReady && status === 'error' && (
            <p className="map-status error">{errorMessage}</p>
          )}
          {mapReady && status === 'success' && validProducers.length === 0 && (
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
