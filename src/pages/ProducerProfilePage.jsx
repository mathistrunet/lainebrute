import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ads, producers } from '../data/marketData.js';
import { api } from '../api.js';

const normalizeText = (value) => value?.trim().toLowerCase();

function ProducerProfilePage() {
  const { producerId } = useParams();
  const currentUser = api.getCurrentUser();
  const isSelfView = !producerId;

  const producer = useMemo(() => {
    if (producerId) {
      return producers.find((item) => item.id === producerId) ?? null;
    }

    const companyName = normalizeText(currentUser?.profile?.companyName);
    if (!companyName) {
      return null;
    }

    return producers.find((item) => normalizeText(item.name) === companyName) ?? null;
  }, [producerId, currentUser]);

  const producerAds = useMemo(() => {
    if (!producer) return [];
    return ads
      .filter((ad) => ad.producerId === producer.id)
      .sort((a, b) => new Date(a.availableFrom) - new Date(b.availableFrom));
  }, [producer]);

  const isOwner = Boolean(
    producer &&
      currentUser?.role === 'producer' &&
      normalizeText(currentUser?.profile?.companyName) === normalizeText(producer.name)
  );

  if (isSelfView && !currentUser) {
    return (
      <section className="producer-profile">
        <h1>Ma page producteur</h1>
        <p className="error">Connectez-vous pour accéder à votre page producteur.</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  if (isSelfView && currentUser?.role !== 'producer') {
    return (
      <section className="producer-profile">
        <h1>Ma page producteur</h1>
        <p className="error">Cette page est réservée aux producteurs enregistrés.</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  if (!producer) {
    return (
      <section className="producer-profile">
        <h1>Producteur introuvable</h1>
        <p>Nous ne parvenons pas à retrouver cette page producteur pour le moment.</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  return (
    <section className="producer-profile">
      <div className="section-header">
        <div>
          <p className="eyebrow">Producteur</p>
          <h1>{producer.name}</h1>
          <p className="muted">{producer.city}</p>
        </div>
        <div className="section-header__actions">
          {isOwner && (
            <Link to="/producteur" className="ghost">
              Gérer mon espace producteur
            </Link>
          )}
          <Link to="/annonces" className="ghost">
            Voir toutes les annonces
          </Link>
        </div>
      </div>

      <div className="grid-2-cols">
        <div className="card">
          <h2>Présentation</h2>
          <p>{producer.description}</p>
          <dl className="description-list">
            <div>
              <dt>Contact</dt>
              <dd>
                <div>{producer.contactEmail}</div>
                <div>{producer.contactPhone}</div>
              </dd>
            </div>
            <div>
              <dt>Site web</dt>
              <dd>{producer.website}</dd>
            </div>
            <div>
              <dt>Disponibilités</dt>
              <dd>{producer.availability}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2>Annonces disponibles</h2>
          <p className="muted">
            Retrouvez ci-dessous toutes les annonces publiées par cette exploitation.
          </p>
          <ul className="card-list">
            {producerAds.map((ad) => (
              <li key={ad.id} className="card">
                <div className="eyebrow">{ad.category}</div>
                <h3>{ad.title}</h3>
                <p>{ad.description}</p>
                <p>Race : {ad.race}</p>
                <p>Disponible à partir du : {ad.availableFrom}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ProducerProfilePage;
