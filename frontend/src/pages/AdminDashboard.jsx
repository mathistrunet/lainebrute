import { useEffect, useMemo, useState } from 'react';
import { ads as fallbackAds, producers as fallbackProducers } from '../mockData.js';
import { apiClient } from '../services/apiClient.js';

const AdminDashboard = () => {
  const [producerItems, setProducerItems] = useState(fallbackProducers);
  const [adItems, setAdItems] = useState(fallbackAds);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    Promise.all([apiClient.getProducers(), apiClient.getAds()])
      .then(([producersResponse, adsResponse]) => {
        if (!isMounted) return;
        setProducerItems(producersResponse);
        setAdItems(adsResponse);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage("Impossible de charger les données administrateur depuis l'API. Les données locales sont affichées.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      producers: producerItems.length,
      ads: adItems.length,
      pendingProducers: producerItems.filter((producer) => !producer.verified).length,
      publishedAds: adItems.filter((ad) => ad.status === 'published').length,
    }),
    [producerItems, adItems]
  );

  return (
    <section>
      <h2>Espace administrateur</h2>
      <p>Supervisez la plateforme, validez les nouveaux producteurs et surveillez les annonces.</p>
      {status === 'loading' && <p>Chargement des données d'administration...</p>}
      {status === 'error' && <p className="error">{errorMessage}</p>}

      <div className="admin-stats">
        <p>Producteurs enregistrés : {stats.producers}</p>
        <p>Producteurs en attente : {stats.pendingProducers}</p>
        <p>Annonces publiées : {stats.publishedAds}</p>
        <p>Total d'annonces : {stats.ads}</p>
      </div>

      <div>
        <h3>Producteurs inscrits</h3>
        <ul>
          {producerItems.map((producer) => (
            <li key={producer.id}>
              <strong>{producer.name}</strong> — {producer.city} • Produits : {producer.products.join(', ')}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button type="button">Valider</button>
                <button type="button">Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Toutes les annonces</h3>
        <ul>
          {adItems.map((ad) => (
            <li key={ad.id}>
              <strong>{ad.title}</strong> ({ad.type}) — {ad.city}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <button type="button">Valider</button>
                <button type="button">Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AdminDashboard;
