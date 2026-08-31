const BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
  const { token, ...fetchOptions } = options;

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });
  } catch {
    throw new Error("Network error — check your connection or the server");
  }

  // No body on e.g. 204 No Content, so parsing failure isn't itself an error.
  let data = null;
  try {
    data = await response.json();
  } catch {
    // no-op
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, token) => apiRequest(endpoint, { token }),
  post: (endpoint, body, token) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(body), token }),
  patch: (endpoint, body, token) => apiRequest(endpoint, { method: "PATCH", body: JSON.stringify(body), token }),
  delete: (endpoint, token) => apiRequest(endpoint, { method: "DELETE", token }),
};