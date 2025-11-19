import { useEffect, useState } from 'react';
import { api } from '../api.js';

const MapPage = () => {
  const [producers, setProducers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

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

  return (
    <section>
      <h2>Carte des producteurs</h2>
      <p>Découvrez les exploitations référencées sur la plateforme.</p>
      <div className="map-placeholder">[Carte interactive à venir]</div>
      {status === 'loading' && <p>Chargement des producteurs...</p>}
      {status === 'error' && <p className="error">{errorMessage}</p>}
      <h3>Producteurs référencés</h3>
      {producers.length === 0 && status === 'success' && (
        <p>Aucun producteur n'a encore été enregistré.</p>
      )}
      <ul>
        {producers.map((producer) => (
          <li key={producer.id}>
            <strong>{producer.name}</strong> — {producer.city || 'Ville non renseignée'}
            <div>{producer.description || 'Description à venir.'}</div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default MapPage;
