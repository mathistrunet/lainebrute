import { ads, producers } from '../mockData.js';

const AdsPage = () => {
  const producerMap = Object.fromEntries(producers.map((producer) => [producer.id, producer]));

  return (
    <section>
      <h2>Annonces</h2>
      <p>Retrouvez toutes les offres et demandes publiées sur la plateforme.</p>
      <ul>
        {ads.map((ad) => (
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
