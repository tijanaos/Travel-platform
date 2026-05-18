import axios from 'axios';

const gatewayClient = axios.create({
  baseURL: 'http://localhost:8084',
});

function setAuthHeader(token: string | null) {
  gatewayClient.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';
}

export const stakeholdersClient = gatewayClient;
export const blogClient = gatewayClient;
export const toursClient = gatewayClient;
export const followerClient = gatewayClient;

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