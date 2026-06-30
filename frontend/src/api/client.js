// src/api/client.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const api = axios.create({ baseURL: API_BASE_URL });

// Attach the JWT to every request automatically, if we have one
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("imextek_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token expires/is invalid, bounce back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      sessionStorage.removeItem("imextek_token");
      sessionStorage.removeItem("imextek_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
