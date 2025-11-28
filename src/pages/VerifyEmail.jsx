import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide ou manquant.');
      return;
    }

    const verify = async () => {
      try {
        setStatus('loading');
        const result = await api.verifyEmail(token);
        setMessage(result?.message ?? 'Votre email est confirmé.');
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setMessage(error.message || "Impossible de vérifier cet email.");
      }
    };

    verify();
  }, [searchParams]);

  const title =
    status === 'success'
      ? 'Email vérifié'
      : status === 'error'
        ? 'Vérification impossible'
        : 'Vérification en cours...';

  return (
    <section className="page">
      <div className="page__header">
        <p className="eyebrow">Sécurité</p>
        <h1>{title}</h1>
        <p className="muted">
          {status === 'success'
            ? 'Merci de confirmer votre adresse. Vous pouvez à présent vous connecter.'
            : "Nous vérifions votre lien. S'il est expiré, relancez une inscription."}
        </p>
      </div>

      <div className="card">
        {status === 'loading' && <p>Validation du lien en cours...</p>}
        {status === 'success' && <p className="success">{message}</p>}
        {status === 'error' && <p className="error">{message}</p>}

        <div className="card__actions">
          <Link to="/" className="ghost">
            Retour à l'accueil
          </Link>
          <Link to="/" className="button">
            Aller à la connexion
          </Link>
        </div>
      </div>
    </section>
  );
}

export default VerifyEmailPage;
