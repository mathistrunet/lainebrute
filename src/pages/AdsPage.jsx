const mockAds = [
  { id: 1, title: 'Recherche tonte 2024', description: 'Nous cherchons 200kg de laine blanche.' },
  { id: 2, title: 'Vente laine locale', description: 'Ferme du Vent propose laine cardée.' },
  { id: 3, title: 'Atelier de tri', description: 'Bénévoles pour session de tri à Lyon.' },
];

function AdsPage() {
  return (
    <section>
      <h1>Annonces</h1>
      <p>Publiez ou consultez les annonces des éleveurs, artisans et coopératives.</p>
      <ul className="card-list">
        {mockAds.map((ad) => (
          <li key={ad.id} className="card">
            <h2>{ad.title}</h2>
            <p>{ad.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AdsPage;
