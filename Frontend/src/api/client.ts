import axios from 'axios';

export const stakeholdersClient = axios.create({
  baseURL: 'http://localhost:8080',
});

export const blogClient = axios.create({
  baseURL: 'http://localhost:8081',
});

export const toursClient = axios.create({
  baseURL: 'http://localhost:8082',
});

export const followerClient = axios.create({
  baseURL: 'http://localhost:8083',
});

function setAuthHeader(token: string | null) {
  const header = token ? `Bearer ${token}` : '';
  stakeholdersClient.defaults.headers.common['Authorization'] = header;
  blogClient.defaults.headers.common['Authorization'] = header;
  toursClient.defaults.headers.common['Authorization'] = header;
  followerClient.defaults.headers.common['Authorization'] = header;
}

export function initAuth() {
  const token = localStorage.getItem('token');
  if (token) setAuthHeader(token);
}

export function saveToken(token: string) {
  localStorage.setItem('token', token);
  setAuthHeader(token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setAuthHeader(null);
}
