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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [siretStatus, setSiretStatus] = useState({ state: 'idle', detail: '' });

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
    setConfirmPassword('');
    setMessage('');
    setError('');
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
      if (message.toLowerCase().includes('email non vérifié')) {
        setError('Email non vérifié. Consultez vos emails pour activer votre compte.');
      } else {
        setError(message);
      }
    } finally {
      setStatus('idle');
    }
  };

  const verifySiret = async (value) => {
    if (!value) {
      setSiretStatus({ state: 'error', detail: 'Renseignez un numéro de SIRET.' });
      return null;
    }
    setSiretStatus({ state: 'loading', detail: "Consultation de l'annuaire..." });
    try {
      const result = await api.verifySiret(value);
      if (result?.valid) {
        setSiretStatus({
          state: 'valid',
          detail: result.entreprise ?? 'Exploitation agricole vérifiée.',
        });
        return result;
      }
      setSiretStatus({ state: 'error', detail: "SIRET introuvable dans l'annuaire." });
      return null;
    } catch (verificationError) {
      setSiretStatus({ state: 'error', detail: verificationError.message });
      return null;
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setStatus('idle');
      setError('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    if (isProducer && (!companyName.trim() || !siret.trim())) {
      setStatus('idle');
      setError("Merci de renseigner le nom de l'entreprise et le SIRET.");
      return;
    }

    try {
      if (isProducer) {
        const siretResult = await verifySiret(siret.trim());
        if (!siretResult) {
          setStatus('idle');
          return;
        }
      }

      await api.register(email.trim(), password.trim(), role);
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
      setMessage('Compte créé. Vérifiez vos emails pour activer votre compte.');
      resetForm();
    } catch (registerError) {
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
    try {
      await api.requestPasswordReset(email.trim());
      setMessage(
        'Un email de récupération sera envoyé si un compte correspond à cette adresse.'
      );
      setMode('login');
    } catch (forgotError) {
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
                <div className="input-with-action">
                  <input
                    type="text"
                    value={siret}
                    onChange={(event) => setSiret(event.target.value)}
                    required={isProducer}
                    placeholder="14 chiffres"
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => verifySiret(siret.trim())}
                    disabled={siretStatus.state === 'loading'}
                  >
                    {siretStatus.state === 'loading' ? 'Vérification...' : 'Vérifier'}
                  </button>
                </div>
                {siretStatus.detail && (
                  <small className={siretStatus.state === 'valid' ? 'success' : 'error'}>
                    {siretStatus.detail}
                  </small>
                )}
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
            <label>
              Mot de passe
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </label>
            <label>
              Confirmation du mot de passe
              <input
                type="password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </label>
          </div>

          <div className="identity-panel__actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'En cours...' : 'Enregistrer'}
            </button>
            <small className="muted">
              Vos informations seront utilisées pour adapter votre expérience et sécuriser vos accès.
            </small>
          </div>
          {error && <p className="error">{error}</p>}
          {message && !error && <p className="success">{message}</p>}
        </form>
      )}
    </section>
  );
}

export default IdentityPanel;
