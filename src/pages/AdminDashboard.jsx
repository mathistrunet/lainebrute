const users = [
  { id: 1, name: 'Ferme Les Prés', role: 'Producteur', status: 'Validé' },
  { id: 2, name: 'Atelier Laine & Co', role: 'Transformateur', status: 'En attente' },
];

const reports = [
  { id: 'A-01', title: 'Tri régional', date: '2024-05-12' },
  { id: 'A-02', title: 'Besoins logistiques', date: '2024-06-01' },
];

function AdminDashboard() {
  return (
    <section>
      <h1>Espace administrateur</h1>
      <p>Supervisez les inscriptions, les annonces et les besoins logistiques.</p>

      <div className="grid">
        <div className="card">
          <h2>Utilisateurs</h2>
          <ul>
            {users.map((user) => (
              <li key={user.id}>
                <strong>{user.name}</strong> — {user.role} ({user.status})
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Rapports récents</h2>
          <ul>
            {reports.map((report) => (
              <li key={report.id}>
                {report.title} — {report.date}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;
