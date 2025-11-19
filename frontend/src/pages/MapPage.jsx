import { useEffect, useState } from 'react';
import { producers as fallbackProducers } from '../mockData.js';
import { apiClient } from '../services/apiClient.js';

const MapPage = () => {
  const [items, setItems] = useState(fallbackProducers);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    apiClient
      .getProducers()
      .then((data) => {
        if (!isMounted) return;
        setItems(data);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage("Impossible de charger les producteurs depuis l'API. Les données locales sont affichées.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section>
      <h2>Carte des producteurs</h2>
      <p>Découvrez les producteurs près de chez vous.</p>
      <div className="map-placeholder">[Carte interactive à venir]</div>
      {status === 'loading' && <p>Chargement des producteurs...</p>}
      {status === 'error' && <p className="error">{errorMessage}</p>}
      <h3>Producteurs référencés</h3>
      <ul>
        {items.map((producer) => (
          <li key={producer.id}>
            <strong>{producer.name}</strong> — {producer.city} • Produits :{' '}
            {producer.products.join(', ')}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MapPage;
