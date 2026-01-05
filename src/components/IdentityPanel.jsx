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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [status, setStatus] = useState('idle');
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [emailDelivery, setEmailDelivery] = useState(null);

  const isProducer = role === 'producer';

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (user?.profile) {
      setFirstName(user.profile.firstName ?? '');
      setLastName(user.profile.lastName ?? '');
      setPhone(user.profile.phone ?? '');
      setRole(user.profile.role ?? user.role ?? 'buyer');
      setCompanyName(user.profile.companyName ?? '');
      setSiret(user.profile.siret ?? '');
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

  const updateUserProfile = (baseUser, profile) => {
    const updatedProfile = api.saveProfile(baseUser?.email ?? email, profile);
    return baseUser ? { ...baseUser, profile: updatedProfile } : null;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    setEmailDelivery(null);
    try {
      const loggedUser = await api.login(email.trim(), password.trim());
      const profile = api.getProfile(loggedUser?.email ?? email);
      const enrichedUser = { ...loggedUser, profile };
      onUserChange?.(enrichedUser);
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

    if (isProducer && !companyName.trim()) {
      setStatus('idle');
      setError("Merci de renseigner le nom de l'entreprise.");
      return;
    }

    try {
      const result = await api.register(email.trim(), role);
      const delivery = result?.emailDelivery ?? null;
      updateUserProfile(user, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        role,
        companyName: companyName.trim(),
        siret: siret.trim(),
      });
      if (user) {
        const profile = api.getProfile(user.email);
        onUserChange?.({ ...user, profile });
      }
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

  const handleDeleteAccount = async () => {
    if (!user) {
      return;
    }
    const warningMessage =
      'Attention : la suppression du compte est irréversible. Toutes vos informations et annonces seront supprimées. Confirmez-vous la suppression ?';
    const confirmed = window.confirm(warningMessage);
    if (!confirmed) {
      return;
    }

    setDeleteStatus('loading');
    setDeleteError('');
    try {
      await api.deleteAccount();
      api.removeProfile(user.email);
      api.logout();
      onUserChange?.(null);
      navigate('/');
      onClose?.();
    } catch (deleteError) {
      setDeleteError(deleteError.message || "Impossible de supprimer le compte.");
    } finally {
      setDeleteStatus('idle');
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
            <p className="identity-panel__user">
              {[user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') ||
                user.email}
            </p>
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

      {(mode === 'register' || mode === 'profile') && (
        <form className="identity-panel__card identity-panel__form" onSubmit={handleRegister}>
          <div className="identity-grid">
            <label>
              Nom
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                placeholder="Votre nom"
              />
            </label>
            <label>
              Prénom
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                placeholder="Votre prénom"
              />
            </label>
            <label>
              Téléphone
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="06 12 34 56 78"
              />
            </label>
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
          </div>

          {isProducer && (
            <div className="identity-grid">
              <label>
                Nom de l'entreprise
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required={isProducer}
                  placeholder="Ferme du bocage"
                />
              </label>
              <label>
                Numéro de SIRET
                <input
                  type="text"
                  value={siret}
                  onChange={(event) => setSiret(event.target.value)}
                  placeholder="SIRET"
                />
              </label>
            </div>
          )}

          <div className="identity-grid">
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

          {mode === 'profile' && user && (
            <div className="identity-panel__danger">
              <p className="error">
                ⚠️ Supprimer votre compte effacera toutes vos informations et vos annonces. Cette action est
                irréversible.
              </p>
              <button type="button" className="ghost" onClick={handleDeleteAccount} disabled={deleteStatus === 'loading'}>
                {deleteStatus === 'loading' ? 'Suppression...' : 'Supprimer mon compte'}
              </button>
              {deleteError && <p className="error">{deleteError}</p>}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

export default IdentityPanel;
