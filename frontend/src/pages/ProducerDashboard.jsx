import { useEffect, useState } from 'react';
import { producerOffers as fallbackOffers } from '../mockData.js';
import { apiClient } from '../services/apiClient.js';

const ProducerDashboard = () => {
  const [form, setForm] = useState({ title: '', quantity: '', price: '' });
  const [offers, setOffers] = useState(fallbackOffers);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setStatus('loading');

    apiClient
      .getOffers()
      .then((data) => {
        if (!isMounted) return;
        setOffers(data);
        setStatus('success');
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage("Impossible de charger les offres depuis l'API. Les données locales sont affichées.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    alert(`Offre sauvegardée : ${form.title || 'Sans titre'}`);
  };

  return (
    <section>
      <h2>Espace producteur</h2>
      <p>Gérez vos offres en cours et préparez vos prochaines annonces.</p>

      <div>
        <h3>Vos offres publiées</h3>
        {status === 'loading' && <p>Chargement des offres...</p>}
        {status === 'error' && <p className="error">{errorMessage}</p>}
        <ul>
          {offers.map((offer) => (
            <li key={offer.id}>
              <strong>{offer.title}</strong> — {offer.quantity} — {offer.price}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>Créer / modifier une offre</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Titre de l'offre
            <input name="title" value={form.title} onChange={handleChange} placeholder="Ex: panier légumes" />
          </label>
          <label>
            Quantité disponible
            <input name="quantity" value={form.quantity} onChange={handleChange} placeholder="Ex: 30 paniers" />
          </label>
          <label>
            Prix indicatif
            <input name="price" value={form.price} onChange={handleChange} placeholder="Ex: 20€" />
          </label>
          <button type="submit">Enregistrer l'offre</button>
        </form>
      </div>
    </section>
  );
};

export default ProducerDashboard;
