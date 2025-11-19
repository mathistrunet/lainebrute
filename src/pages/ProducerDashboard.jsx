const offers = [
  { id: 1, name: 'Lot mérinos 50kg', status: 'Publié' },
  { id: 2, name: 'Laine noire brute 120kg', status: 'Brouillon' },
];

function ProducerDashboard() {
  return (
    <section>
      <h1>Espace producteur</h1>
      <p>Gérez vos lots de laine, vos disponibilités et vos échanges.</p>

      <form className="form-card">
        <label>
          Nom du lot
          <input type="text" placeholder="Ex: Lot printemps" />
        </label>
        <label>
          Quantité (kg)
          <input type="number" min="0" placeholder="100" />
        </label>
        <label>
          Description
          <textarea rows="3" placeholder="Précisez la race, la couleur..."></textarea>
        </label>
        <button type="button">Enregistrer</button>
      </form>

      <h2>Vos offres</h2>
      <ul className="card-list">
        {offers.map((offer) => (
          <li key={offer.id} className="card">
            <div>
              <strong>{offer.name}</strong>
              <p>Statut : {offer.status}</p>
            </div>
            <button type="button" className="ghost">Modifier</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ProducerDashboard;
