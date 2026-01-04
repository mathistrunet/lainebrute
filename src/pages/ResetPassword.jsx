import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Lien de réinitialisation invalide.');
      return;
    }

    if (password !== confirmPassword) {
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setStatus('loading');
    try {
      const result = await api.resetPassword(token, password.trim());
      setMessage(result?.message ?? 'Mot de passe mis à jour. Vous pouvez vous connecter.');
      setPassword('');
      setConfirmPassword('');
    } catch (resetError) {
      setError(resetError.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <section className="form-card">
      <header>
        <p className="eyebrow">Réinitialisation</p>
        <h2>Nouveau mot de passe</h2>
        <p className="muted">
          Choisissez un nouveau mot de passe pour sécuriser votre compte.
        </p>
      </header>

      {!token && (
        <>
          <p className="error">Le lien de réinitialisation est manquant ou invalide.</p>
          <Link to="/" className="ghost">
            Retour à l&apos;accueil
          </Link>
        </>
      )}

      {token && (
        <form className="form-grid-2" onSubmit={handleSubmit}>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="••••••••"
            />
          </label>
          <label>
            Confirmation du mot de passe
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="••••••••"
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
            <Link to="/" className="ghost">
              Retour à l&apos;accueil
            </Link>
          </div>
          {error && <p className="error">{error}</p>}
          {message && !error && <p className="success">{message}</p>}
        </form>
      )}
    </section>
  );
}

export default ResetPassword;
