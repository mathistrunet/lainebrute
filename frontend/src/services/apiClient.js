const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload.error ?? response.statusText;
    throw new Error(message || 'Une erreur inconnue est survenue');
  }

  const payload = await response.json();
  return payload.data ?? payload;
}

export const apiClient = {
  getProducers: () => request('/producers'),
  getAds: () => request('/ads'),
  getOffers: () => request('/offers'),
  getMessages: () => request('/messages'),
  createMessage: (body) => request('/messages', { method: 'POST', body: JSON.stringify(body) }),
};
