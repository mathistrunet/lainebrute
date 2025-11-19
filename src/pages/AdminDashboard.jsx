import { ads, producers } from '../mockData.js';

const AdminDashboard = () => {
  return (
    <section>
      <h2>Espace administrateur</h2>
      <p>Supervisez la plateforme, validez les nouveaux producteurs et surveillez les annonces.</p>

      <div>
        <h3>Producteurs inscrits</h3>
        <ul>
          {producers.map((producer) => (
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
          {ads.map((ad) => (
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
