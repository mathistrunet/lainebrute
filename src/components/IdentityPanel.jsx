import { useEffect, useState } from 'react';
import { api } from '../api.js';

const ROLES = [
  { value: 'producer', label: 'Producteur' },
  { value: 'buyer', label: 'Acheteur' },
  { value: 'admin', label: 'Admin' },
];

function IdentityPanel() {
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('producer');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setUser(api.getCurrentUser());
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('producer');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    try {
      const loggedUser = await api.login(email.trim(), password.trim());
      setUser(loggedUser);
      setMessage('Connexion réussie.');
      resetForm();
    } catch (loginError) {
      setError(loginError.message || "Impossible de s'identifier");
    } finally {
      setStatus('idle');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');
    setMessage('');
    try {
      await api.register(email.trim(), password.trim(), role);
      setMode('login');
      setMessage('Compte créé, vous pouvez vous connecter.');
      resetForm();
    } catch (registerError) {
      setError(registerError.message || "Inscription impossible");
    } finally {
      setStatus('idle');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setMessage('Vous êtes déconnecté.');
  };

  return (
    <section className="identity-panel">
      <header className="identity-panel__header">
        <div>
          <p className="eyebrow">Identification</p>
          <h2>Accédez à vos espaces</h2>
          <p className="muted">
            Connectez-vous pour retrouver vos annonces, vos offres ou votre suivi administrateur.
          </p>
        </div>
        <div className="identity-panel__switch">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Connexion
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Inscription
          </button>
        </div>
      </header>

      {user ? (
        <div className="identity-panel__card">
          <div>
            <p className="muted">Connecté</p>
            <p className="identity-panel__user">{user.email}</p>
            <p className="tag">Rôle : {user.role}</p>
          </div>
          <div className="identity-panel__actions">
            <button type="button" className="ghost" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>
      ) : (
        <form
          className="identity-panel__card identity-panel__form"
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
        >
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
          {mode === 'register' && (
            <label>
              Rôle souhaité
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                {ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="identity-panel__actions">
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'En cours...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
            <small className="muted">
              {mode === 'login' ? 'Accès aux tableaux de bord producteurs, admin et annonces.' :
              'Un email de confirmation peut être nécessaire selon votre rôle.'}
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
