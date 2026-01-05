import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const ACCOUNT_ROLES = [
  { value: 'producer', label: 'Producteur' },
  { value: 'buyer', label: 'Acheteur' },
];

function IdentityPanel({ user, onUserChange, onClose, defaultMode = 'login' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailDelivery, setEmailDelivery] = useState(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (user) {
      setRole(user.role ?? 'buyer');
      setEmail(user.email ?? '');
    }
  }, [user]);

  const resetForm = () => {
    setPassword('');
    setMessage('');
    setError('');
  };

  const formatEmailDelivery = (delivery) => {
    if (!delivery) {
      return null;
    }
    if (delivery.sent) {
      return `Email envoyé à ${delivery.to}.`;
    }
    const reason = delivery.error ? ` (${delivery.error})` : '';
    return `Email non envoyé à ${delivery.to}.${reason}`;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    setEmailDelivery(null);
    try {
      const loggedUser = await api.login(email.trim(), password.trim());
      onUserChange?.(loggedUser);
      setMessage('Connexion réussie.');
      navigate('/');
      onClose?.();
      resetForm();
    } catch (loginError) {
      const message = loginError.message || "Impossible de s'identifier";
      setError(message);
    } finally {
      setStatus('idle');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    setEmailDelivery(null);

    try {
      const result = await api.register(email.trim(), role);
      const delivery = result?.emailDelivery ?? null;
      setMode('login');
      setMessage('Compte créé. Consultez vos emails pour créer votre mot de passe.');
      setEmailDelivery(delivery);
      resetForm();
    } catch (registerError) {
      setEmailDelivery(registerError.details?.emailDelivery ?? null);
      setError(registerError.message || 'Inscription impossible');
    } finally {
      setStatus('idle');
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    setEmailDelivery(null);
    try {
      const result = await api.requestPasswordReset(email.trim());
      const delivery = result?.emailDelivery ?? null;
      setEmailDelivery(delivery);
      if (delivery?.sent) {
        setMessage(`Email de récupération envoyé à ${delivery.to}.`);
      } else {
        setError(delivery?.error || 'Impossible de traiter la demande.');
      }
      setMode('login');
    } catch (forgotError) {
      setEmailDelivery(forgotError.details?.emailDelivery ?? null);
      setError(forgotError.message || 'Impossible de traiter la demande.');
    } finally {
      setStatus('idle');
    }
  };

  const tabs = useMemo(
    () => [
      { value: 'login', label: 'Connexion' },
      { value: 'register', label: 'Inscription' },
    ],
    []
  );

  const showForgot = mode === 'forgot';
  const formTitle = showForgot
    ? 'Mot de passe oublié'
    : mode === 'register'
      ? 'Créez votre compte'
      : 'Accédez à vos espaces';
  const emailDeliveryMessage = formatEmailDelivery(emailDelivery);
  const emailDeliveryHasError = emailDeliveryMessage && !emailDelivery?.sent;

  return (
    <section className="identity-panel">
      <header className="identity-panel__header">
        <div>
          <p className="eyebrow">Identification</p>
          <h2>{formTitle}</h2>
          <p className="muted">
            {showForgot
              ? 'Indiquez votre email pour recevoir un lien de réinitialisation.'
              : 'Connectez-vous pour retrouver vos annonces, vos offres ou votre suivi.'}
          </p>
        </div>
        <div className="identity-panel__controls">
          {!showForgot && (
            <div className="identity-panel__switch">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={mode === tab.value ? 'active' : ''}
                  onClick={() => setMode(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            Fermer
          </button>
        </div>
      </header>

      {user && mode === 'login' && (
        <div className="identity-panel__card">
          <div>
            <p className="muted">Connecté</p>
            <p className="identity-panel__user">{user.email}</p>
            <p className="tag">Rôle : {user.role}</p>
          </div>
          <div className="identity-panel__actions">
            <button type="button" className="ghost" onClick={onClose}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {!user && mode === 'login' && (
        <form className="identity-panel__card identity-panel__form" onSubmit={handleLogin}>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              placeholder="vous@example.fr"
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>
          <div className="identity-panel__actions identity-panel__actions--between">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'En cours...' : 'Se connecter'}
            </button>
            <button type="button" className="ghost" onClick={() => setMode('forgot')}>
              Mot de passe oublié ?
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {emailDeliveryMessage && (
            <p className={emailDeliveryHasError ? 'error' : 'success'}>{emailDeliveryMessage}</p>
          )}
          {message && !error && <p className="success">{message}</p>}
        </form>
      )}

      {showForgot && (
        <form className="identity-panel__card identity-panel__form" onSubmit={handleForgotPassword}>
          <label>
            Email de récupération
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="vous@example.fr"
            />
          </label>
          <div className="identity-panel__actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <button type="button" className="ghost" onClick={() => setMode('login')}>
              Retour
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {emailDeliveryMessage && (
            <p className={emailDeliveryHasError ? 'error' : 'success'}>{emailDeliveryMessage}</p>
          )}
          {message && !error && <p className="success">{message}</p>}
        </form>
      )}

      {mode === 'register' && (
        <form className="identity-panel__card identity-panel__form" onSubmit={handleRegister}>
          <div className="identity-grid">
            <label>
              Statut
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                {ACCOUNT_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="vous@example.fr"
              />
            </label>
          </div>

          <div className="identity-panel__actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'En cours...' : 'Enregistrer'}
            </button>
            <small className="muted">
              Vous recevrez un email pour créer votre mot de passe et finaliser la connexion.
            </small>
          </div>
          {error && <p className="error">{error}</p>}
          {emailDeliveryMessage && (
            <p className={emailDeliveryHasError ? 'error' : 'success'}>{emailDeliveryMessage}</p>
          )}
          {message && !error && <p className="success">{message}</p>}
        </form>
      )}
    </section>
  );
}

export default IdentityPanel;
