import { useEffect, useMemo, useState } from 'react';
import { ads as fallbackAds, producers as fallbackProducers } from '../mockData.js';
import { apiClient } from '../services/apiClient.js';

const AdsPage = () => {
  const [adItems, setAdItems] = useState(fallbackAds);
  const [producerItems, setProducerItems] = useState(fallbackProducers);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    Promise.all([apiClient.getAds(), apiClient.getProducers()])
      .then(([adsResponse, producersResponse]) => {
        if (!isMounted) return;
        setAdItems(adsResponse);
        setProducerItems(producersResponse);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage("Impossible de charger les annonces depuis l'API. Les données locales sont affichées.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const producerMap = useMemo(
    () => Object.fromEntries(producerItems.map((producer) => [producer.id, producer])),
    [producerItems]
  );

  return (
    <section>
      <h2>Annonces</h2>
      <p>Retrouvez toutes les offres et demandes publiées sur la plateforme.</p>
      {status === 'loading' && <p>Chargement des annonces...</p>}
      {status === 'error' && <p className="error">{errorMessage}</p>}
      <ul>
        {adItems.map((ad) => (
          <li key={ad.id}>
            <strong>{ad.title}</strong> — {ad.type.toUpperCase()}<br />
            Producteur : {producerMap[ad.producerId]?.name || 'Inconnu'} ({ad.city})
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AdsPage;
