const runtime = typeof globalThis !== 'undefined' ? globalThis : {};
const isViteDevHost =
  runtime.location?.hostname === 'localhost' && runtime.location?.port === '5173';
const DEFAULT_API_ORIGIN = isViteDevHost
  ? 'http://localhost:4000'
  : runtime.location?.origin ?? 'http://localhost:4000';
const RAW_API_BASE_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_ORIGIN;
const NORMALIZED_API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '');
const API_BASE_URL = NORMALIZED_API_BASE_URL.endsWith('/api')
  ? NORMALIZED_API_BASE_URL
  : `${NORMALIZED_API_BASE_URL}/api`;
const TOKEN_STORAGE_KEY = 'lainebrute.jwt';

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

const getCurrentUser = () => {
  const payload = decodeTokenPayload(getToken());
  if (!payload) return null;
  return { ...payload };
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
    const error = new Error(message || 'Erreur inconnue');
    error.details = payload?.data ?? payload ?? null;
    throw error;
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
  register: (email, role = 'producer') =>
    request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  requestPasswordReset: async (email) => {
    if (!email) {
      throw new Error('Adresse email requise.');
    }
    return request('/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  resetPassword: (token, password) => {
    if (!token) {
      return Promise.reject(new Error('Lien de réinitialisation invalide.'));
    }
    if (!password) {
      return Promise.reject(new Error('Nouveau mot de passe requis.'));
    }
    return request('/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
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
  deleteAccount: () => request('/account', { method: 'DELETE' }),
  getAdminUsers: () => request('/admin/users'),
  updateAdminUser: (userId, body) =>
    request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAdminUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),
  getAdminProducers: () => request('/admin/producers'),
  updateAdminProducer: (producerId, body) =>
    request(`/admin/producers/${producerId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteAdminProducer: (producerId) =>
    request(`/admin/producers/${producerId}`, { method: 'DELETE' }),
  getAdminOffers: () => request('/admin/offers'),
  getAdminDatabase: (options = {}) => {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
      params.set('limit', String(options.limit));
    }
    const suffix = params.toString();
    return request(`/admin/database${suffix ? `?${suffix}` : ''}`);
  },
  getAdminTraffic: () => request('/admin/traffic'),
  sendReport: (body) =>
    request('/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  sendContact: (body) =>
    request('/contact', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
