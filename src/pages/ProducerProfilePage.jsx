import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('fr-FR');
};

function ProducerProfilePage() {
  const { producerId } = useParams();
  const currentUser = api.getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const currentUserRole = currentUser?.role ?? null;
  const isSelfView = !producerId;
  const [producer, setProducer] = useState(null);
  const [producerAds, setProducerAds] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const contact =
    producer?.contact ?? {
      first_name: producer?.first_name ?? null,
      last_name: producer?.last_name ?? null,
      phone: producer?.phone ?? null,
      siret: producer?.siret ?? null,
    };

  useEffect(() => {
    let isMounted = true;

    const loadProducerData = async () => {
      setStatus('loading');
      setError('');
      try {
        let resolvedProducer = null;

        if (isSelfView) {
          resolvedProducer = await api.getMyProducerProfile();
        } else {
          const producers = await api.getProducers();
          resolvedProducer = producers.find(
            (item) => String(item.id) === String(producerId)
          );
        }

        if (!isMounted) return;
        setProducer(resolvedProducer ?? null);

        const offers = await api.getOffers();
        if (!isMounted) return;

        const filteredAds = Array.isArray(offers)
          ? offers.filter((ad) => String(ad.producer_id) === String(resolvedProducer?.id))
          : [];

        setProducerAds(
          filteredAds.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        );
      } catch (fetchError) {
        console.error(fetchError);
        if (!isMounted) return;
        setError('Impossible de récupérer les données du producteur.');
      } finally {
        if (isMounted) {
          setStatus('idle');
        }
      }
    };

    if (isSelfView && !currentUser) {
      return () => {
        isMounted = false;
      };
    }

    loadProducerData();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, currentUserRole, isSelfView, producerId]);

  const isOwner = useMemo(
    () => Boolean(isSelfView && currentUser?.role === 'producer'),
    [isSelfView, currentUser]
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

  if (status === 'loading') {
    return (
      <section className="producer-profile">
        <h1>Chargement du producteur...</h1>
      </section>
    );
  }

  if (error) {
    return (
      <section className="producer-profile">
        <h1>Producteur introuvable</h1>
        <p className="error">{error}</p>
        <Link to="/annonces" className="ghost">
          Retour aux annonces
        </Link>
      </section>
    );
  }

  if (isSelfView && !producer) {
    return (
      <section className="producer-profile">
        <h1>Ma page producteur</h1>
        <p className="muted">
          Vous n&apos;avez pas encore renseigné vos informations producteur.
        </p>
        <Link to="/producteur" className="ghost">
          Créer mon profil producteur
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
          {isOwner && isSelfView && (
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
          <p>{producer.description || 'Présentation non renseignée.'}</p>
          <dl className="description-list">
            <div>
              <dt>Contact</dt>
              <dd>
                <div>
                  {contact.first_name || contact.last_name
                    ? `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim()
                    : 'Non renseigné'}
                </div>
                <div>{contact.phone ?? 'Non renseigné'}</div>
              </dd>
            </div>
            <div>
              <dt>SIRET</dt>
              <dd>{contact.siret ?? 'Non renseigné'}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2>Annonces disponibles</h2>
          <p className="muted">
            Retrouvez ci-dessous toutes les annonces publiées par cette exploitation.
          </p>
          <ul className="card-list">
            {producerAds.length ? (
              producerAds.map((ad) => (
                <li key={ad.id} className="card">
                  <div className="eyebrow">Annonce producteur</div>
                  <h3>{ad.title}</h3>
                  <p>{ad.description || 'Pas de description fournie.'}</p>
                  <p>Ville : {ad.city ?? producer.city ?? 'Ville inconnue'}</p>
                  <p>Publié le : {formatDate(ad.created_at)}</p>
                </li>
              ))
            ) : (
              <li className="card">
                <p>Aucune annonce disponible pour le moment.</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default ProducerProfilePage;
