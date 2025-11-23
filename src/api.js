const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'lainebrute.jwt';
const PROFILE_STORAGE_KEY = 'lainebrute.profiles';
const runtime = typeof globalThis !== 'undefined' ? globalThis : {};

const getStorage = () => runtime.localStorage ?? null;

const storeToken = (token) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  if (!token) {
    storage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  storage.setItem(TOKEN_STORAGE_KEY, token);
};

const getToken = () => {
  const storage = getStorage();
  return storage ? storage.getItem(TOKEN_STORAGE_KEY) : null;
};

const decodeTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const [, payloadSegment] = token.split('.');
    const decoder = typeof runtime.atob === 'function' ? runtime.atob.bind(runtime) : null;
    if (!payloadSegment || !decoder) {
      return null;
    }
    const normalizedSegment = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decoder(normalizedSegment));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      storeToken(null);
      return null;
    }
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch (error) {
    console.error('Impossible de décoder le token JWT', error);
    return null;
  }
};

const getProfiles = () => {
  const storage = getStorage();
  if (!storage) return {};
  try {
    return JSON.parse(storage.getItem(PROFILE_STORAGE_KEY)) ?? {};
  } catch (error) {
    console.warn('Impossible de lire les profils stockés', error);
    return {};
  }
};

const persistProfiles = (profiles) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
};

const saveProfile = (email, profile) => {
  if (!email) return null;
  const profiles = getProfiles();
  profiles[email] = { ...(profiles[email] ?? {}), ...profile };
  persistProfiles(profiles);
  return profiles[email];
};

const getProfile = (email) => {
  if (!email) return null;
  const profiles = getProfiles();
  return profiles[email] ?? null;
};

const getCurrentUser = () => {
  const payload = decodeTokenPayload(getToken());
  if (!payload) return null;
  return { ...payload, profile: getProfile(payload.email) };
};

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  let payload = null;
  const rawBody = await response.text();
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Réponse JSON invalide', error);
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      storeToken(null);
    }
    const message = payload?.error ?? response.statusText;
    throw new Error(message || 'Erreur inconnue');
  }

  return payload?.data ?? payload ?? null;
}

export const api = {
  getCurrentUser,
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }
    const { token } = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    storeToken(token);
    return getCurrentUser();
  },
  register: (email, password, role = 'producer') =>
    request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),
  saveProfile: (email, profile) => saveProfile(email, profile),
  getProfile,
  verifySiret: (siret) => request(`/siret/${encodeURIComponent(siret ?? '')}`),
  requestPasswordReset: async (email) => {
    if (!email) {
      throw new Error('Adresse email requise.');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { ok: true };
  },
  logout: () => storeToken(null),
  getProducers: () => request('/producers'),
  createProducerProfile: (body) =>
    request('/producers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMyProducerProfile: () => request('/my-producer'),
  getOffers: () => request('/offers'),
  getMyOffers: () => request('/my-offers'),
  createOffer: (body) =>
    request('/offers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateOffer: (offerId, body) =>
    request(`/offers/${offerId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteOffer: (offerId) => request(`/offers/${offerId}`, { method: 'DELETE' }),
  getAdminUsers: () => request('/admin/users'),
  getAdminOffers: () => request('/admin/offers'),
  getAdminDatabase: () => request('/admin/database'),
};
