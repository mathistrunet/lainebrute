import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { SimpleMap } from '../lib/simpleMap.js';

const DEFAULT_CENTER = [46.7111, 1.7191];

const normalizeProduct = (product) => {
  if (!product) {
    return null;
  }
  if (typeof product === 'string') {
    const name = product.trim();
    return name ? { id: name, name, description: '' } : null;
  }
  if (typeof product === 'object') {
    const name = (product.name ?? product.title ?? '').trim();
    const description = (product.description ?? '').trim();
    const fallbackId = product.id ?? (name || description || product.city || JSON.stringify(product));
    return {
      id: String(fallbackId),
      name: name || description || 'Produit',
      description,
    };
  }
  return null;
};

const MapPage = () => {
  const [producers, setProducers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [productFilter, setProductFilter] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const listRefs = useRef(new Map());

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    Promise.all([api.getProducers(), api.getOffers()])
      .then(([producerData, offerData]) => {
        if (!isMounted) return;
        setProducers(Array.isArray(producerData) ? producerData : []);
        setOffers(Array.isArray(offerData) ? offerData : []);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setProducers([]);
        setOffers([]);
        setStatus('error');
        setErrorMessage(error.message || "Impossible de charger les producteurs.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const offersByProducer = useMemo(() => {
    return offers.reduce((acc, offer) => {
      if (!Number.isFinite(offer?.producer_id)) {
        return acc;
      }
      const normalized = normalizeProduct({
        id: offer.id,
        name: offer.title,
        description: offer.description,
      });
      if (!normalized) {
        return acc;
      }
      const list = acc.get(offer.producer_id) ?? [];
      list.push(normalized);
      acc.set(offer.producer_id, list);
      return acc;
    }, new Map());
  }, [offers]);

  const producersById = useMemo(() => {
    return producers.reduce((acc, producer) => {
      if (!producer || !Number.isFinite(producer.id)) {
        return acc;
      }
      const productsFromApi = Array.isArray(producer.products) ? producer.products : [];
      const normalizedApiProducts = productsFromApi
        .map((product) => normalizeProduct(product))
        .filter(Boolean);
      const offerProducts = offersByProducer.get(producer.id) ?? [];
      const seen = new Set();
      const mergedProducts = [];
      [...normalizedApiProducts, ...offerProducts].forEach((product) => {
        if (!product) {
          return;
        }
        const key = product.id ?? `${product.name}:${product.description}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        mergedProducts.push(product);
      });
      acc.set(producer.id, {
        ...producer,
        products: mergedProducts,
      });
      return acc;
    }, new Map());
  }, [offersByProducer, producers]);

  const validProducers = useMemo(() => {
    return Array.from(producersById.values()).filter(
      (producer) => Number.isFinite(producer?.lat) && Number.isFinite(producer?.lng)
    );
  }, [producersById]);

  const availableProductOptions = useMemo(() => {
    const names = new Set();
    validProducers.forEach((producer) => {
      (producer.products ?? []).forEach((product) => {
        const name = (product?.name || '').trim();
        if (name) {
          names.add(name);
        }
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [validProducers]);

  const filteredProducers = useMemo(() => {
    const query = productFilter.trim().toLowerCase();
    if (!query) {
      return validProducers;
    }
    return validProducers.filter((producer) => {
      const haystacks = [producer.description ?? '', producer.city ?? ''];
      (producer.products ?? []).forEach((product) => {
        haystacks.push(product?.name ?? '');
        haystacks.push(product?.description ?? '');
      });
      const normalized = haystacks.join(' ').toLowerCase();
      return normalized.includes(query);
    });
  }, [productFilter, validProducers]);

  useEffect(() => {
    if (selectedProducerId && !filteredProducers.some((entry) => entry.id === selectedProducerId)) {
      setSelectedProducerId(null);
    }
  }, [filteredProducers, selectedProducerId]);

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
      filteredProducers.map((producer) => ({
        id: producer.id,
        lat: producer.lat,
        lng: producer.lng,
        name: producer.name,
        city: producer.city,
      })),
    [filteredProducers]
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

  const selectedProducer = selectedProducerId
    ? producersById.get(selectedProducerId) ?? null
    : null;

  const selectedProducts = selectedProducer?.products ?? [];

  const handleFilterChange = (event) => {
    setProductFilter(event.target.value);
  };

  const clearFilter = () => setProductFilter('');

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
          <form className="map-filter" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="product-filter-input">Filtrer par produit</label>
            <div className="map-filter__controls">
              <input
                id="product-filter-input"
                list="product-filter-options"
                type="text"
                placeholder="Ex. pomme de terre"
                value={productFilter}
                onChange={handleFilterChange}
              />
              {productFilter && (
                <button type="button" onClick={clearFilter} className="map-filter__reset">
                  Effacer
                </button>
              )}
            </div>
            <small>
              {filteredProducers.length} producteur{filteredProducers.length > 1 ? 's' : ''} sur la carte
            </small>
            <datalist id="product-filter-options">
              {availableProductOptions.map((option) => (
                <option value={option} key={option} />
              ))}
            </datalist>
          </form>

          {selectedProducer && (
            <article className="map-producer-card">
              <div>
                <p className="map-producer-card__city">{selectedProducer.city || 'Ville non renseignée'}</p>
                <h4>{selectedProducer.name}</h4>
                <p>{selectedProducer.description || 'Description à venir.'}</p>
              </div>
              <div className="map-producer-card__products">
                {selectedProducts.length === 0 && <p>Aucun produit renseigné pour le moment.</p>}
                {selectedProducts.length > 0 && (
                  <ul>
                    {selectedProducts.map((product) => (
                      <li key={product.id || product.name}>
                        <strong>{product.name}</strong>
                        {product.description && <span>{product.description}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" onClick={() => setSidebarOpen(true)}>
                Voir la fiche complète
              </button>
            </article>
          )}
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
              <p>
                {filteredProducers.length} affiché(s)
                {productFilter && ` sur ${producers.length}`}
              </p>
            </div>
          </div>

          {status === 'loading' && <p>Chargement des producteurs...</p>}
          {status === 'error' && <p className="error">{errorMessage}</p>}

          {status === 'success' && producers.length === 0 && (
            <p>Aucun producteur n'a encore été enregistré.</p>
          )}

          {filteredProducers.length === 0 && productFilter && (
            <p>Aucun producteur ne correspond à « {productFilter} ».</p>
          )}

          {filteredProducers.length > 0 && (
            <ul>
              {filteredProducers.map((producer) => (
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
              <div className="producer-products">
                <h5>Produits disponibles</h5>
                {selectedProducts.length === 0 && <p>Ce producteur n'a pas encore listé ses produits.</p>}
                {selectedProducts.length > 0 && (
                  <ul>
                    {selectedProducts.map((product) => (
                      <li key={product.id || product.name}>
                        <span className="producer-products__name">{product.name}</span>
                        {product.description && (
                          <span className="producer-products__description">{product.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default MapPage;
