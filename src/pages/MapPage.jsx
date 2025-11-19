import { producers } from '../mockData.js';

const MapPage = () => {
  return (
    <section>
      <h2>Carte des producteurs</h2>
      <p>Découvrez les producteurs près de chez vous.</p>
      <div className="map-placeholder">[Carte interactive à venir]</div>
      <h3>Producteurs référencés</h3>
      <ul>
        {producers.map((producer) => (
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
