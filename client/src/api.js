export const getToken = () => localStorage.getItem('cp_token');

const API_URL = import.meta.env.VITE_API_URL || '';

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};

  if (getToken()) {
    headers.Authorization = 'Bearer ' + getToken();
  }

  let payload;

  if (form) {
    payload = form;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const r = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: payload
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(d.message || 'Request failed');
  }

  return d;
}