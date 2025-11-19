import { useEffect, useState } from 'react';
import { api } from '../api.js';

const AdsPage = () => {
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    api
      .getOffers()
      .then((data) => {
        if (!isMounted) return;
        setOffers(Array.isArray(data) ? data : []);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setOffers([]);
        setStatus('error');
        setErrorMessage(error.message || "Impossible de charger les annonces.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section>
      <h2>Annonces</h2>
      <p>Retrouvez toutes les offres publiées par les producteurs inscrits.</p>
      {status === 'loading' && <p>Chargement des annonces...</p>}
      {status === 'error' && <p className="error">{errorMessage}</p>}
      {offers.length === 0 && status === 'success' && <p>Aucune offre disponible pour le moment.</p>}
      <ul>
        {offers.map((offer) => (
          <li key={offer.id}>
            <strong>{offer.title}</strong> — {offer.city || 'Ville non renseignée'}
            <br />
            {offer.description && <span>{offer.description}</span>}
            <div>
              Producteur : {offer.producer?.name || 'Inconnu'}{' '}
              {offer.producer?.city ? `(${offer.producer.city})` : ''}
            </div>
            <small>Publiée le {new Date(offer.created_at).toLocaleDateString('fr-FR')}</small>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AdsPage;
