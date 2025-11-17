import axios from 'axios';

// 1. Set the base URL for our FastAPI backend
const API_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

// 2. The Interceptor: This is the magic.
// It runs before *every* request.
api.interceptors.request.use(
  (config) => {
    // Get the token from local storage
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      // If the token exists, add it to the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// 3. Specific API calls for authentication
// Note: FastAPI's OAuth2 uses form data, not JSON, for the token endpoint
api.interceptors.response.use(
  (response) => {
    // Any successful response just passes through
    return response;
  },
  (error) => {
    // Check if it's a 401 Unauthorized error
    if (error.response && error.response.status === 401) {
      console.error("AUTH ERROR 401: Token is expired or invalid. Logging out.");
      
      // Dispatch a custom event that the AuthContext can listen for.
      // This is cleaner than a hard page reload.
      window.dispatchEvent(new Event('auth-error'));
    }
    
    // Return the error so the component's .catch() still fires
    return Promise.reject(error);
  }
);

export const loginUser = async (email, password) => {
  const params = new URLSearchParams();
  params.append('username', email); // 'username' is the field FastAPI's form expects
  params.append('password', password);

  // We set the Content-Type header for the form data
  return api.post('/auth/token', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

export const registerUser = async (email, password) => {
  // The /register endpoint *does* expect JSON
  return api.post('/auth/register', {
    email: email,
    password: password,
  });
};

// We also export the 'api' instance itself
// This allows other parts of our app (e.t., printerService.js)
// to make authenticated requests like `api.get('/printers')`
export default api;