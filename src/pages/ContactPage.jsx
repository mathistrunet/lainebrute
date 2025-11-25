import { useState } from 'react';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatus('submitted');
  };

  return (
    <section className="contact-page">
      <h1>Nous contacter</h1>
      <p>
        Une question, une réclamation ou une suggestion d&apos;amélioration ? Complétez le formulaire ci-dessous pour
        écrire directement aux responsables du site. Nous faisons notre possible pour répondre rapidement.
      </p>

      <div className="contact-grid">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <label>
              Nom et prénom
              <input
                required
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Votre nom complet"
              />
            </label>
            <label>
              Adresse e-mail
              <input
                required
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="vous@example.com"
              />
            </label>
          </div>

          <label>
            Sujet
            <input
              required
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Objet de votre message"
            />
          </label>

          <label>
            Message
            <textarea
              required
              name="message"
              rows="6"
              value={formData.message}
              onChange={handleChange}
              placeholder="Décrivez votre demande avec le plus de détails possible"
            />
          </label>

          <div className="form-actions">
            <button type="submit">Envoyer la demande</button>
            <span className="helper-text">Aucun compte n&apos;est requis pour nous écrire.</span>
          </div>

          {status === 'submitted' && (
            <div className="contact-status" role="status">
              Merci, votre message a été enregistré. Un membre de l&apos;équipe vous répondra prochainement.
            </div>
          )}
        </form>

        <div className="info-card">
          <h2>Autres moyens de nous joindre</h2>
          <p>
            Vous pouvez également utiliser ces informations pour contacter directement l&apos;équipe Laine Brute et
            suivre l&apos;avancement de vos demandes.
          </p>
          <ul className="stacked-list">
            <li>
              <div className="eyebrow">Adresse e-mail</div>
              <strong>contact@lainebrute.fr</strong>
            </li>
            <li>
              <div className="eyebrow">Disponibilités</div>
              <p>Réponses en semaine (48h ouvrées en moyenne)</p>
            </li>
            <li>
              <div className="eyebrow">Support</div>
              <p>Assistance sur l&apos;utilisation du site et signalement de contenu</p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ContactPage;
