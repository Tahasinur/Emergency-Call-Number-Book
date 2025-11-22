const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

class EmergencyAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem("token");
  }

  getHeaders(includeAuth = true) {
    const headers = { "Content-Type": "application/json" };
    if (includeAuth) {
      const token = this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.getHeaders(options.auth !== false),
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    return data;
  }

  // Authentication methods
  async login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      auth: false,
    });
  }

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
      auth: false,
    });
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      localStorage.clear();
      window.location.href = "index.html";
    }
  }

  // Admin: services
  async getAllServicesAdmin() {
    return this.request("/admin/services");
  }

  async createService(serviceData) {
    return this.request("/admin/services", {
      method: "POST",
      body: JSON.stringify(serviceData),
    });
  }

  async updateService(serviceId, serviceData) {
    return this.request(`/admin/services/${serviceId}`, {
      method: "PUT",
      body: JSON.stringify(serviceData),
    });
  }

  async deleteService(serviceId) {
    return this.request(`/admin/services/${serviceId}`, { method: "DELETE" });
  }

  // Admin: services with image upload
  async createServiceWithImage(formData) {
    const token = this.getToken();
    const response = await fetch(`${this.baseURL}/admin/services`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    return data;
  }

  async updateServiceWithImage(serviceId, formData) {
    const token = this.getToken();
    const response = await fetch(
      `${this.baseURL}/admin/services/${serviceId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    return data;
  }

  // Admin: users
  async getAllUsers() {
    return this.request("/admin/users");
  }

  async updateUserRole(userId, role) {
    return this.request(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async getUsersCount() {
    return this.request("/admin/users/count");
  }

  // Admin: call history
  async getAllCalls(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const endpoint = qs ? `/admin/calls?${qs}` : `/admin/calls`;
    return this.request(endpoint);
  }

  // Chat system
  async createChatSession() {
    return this.request("/chat/session", {
      method: "POST",
    });
  }

  async getWaitingSessions() {
    return this.request("/chat/sessions/waiting");
  }

  async assignSession(sessionId) {
    return this.request(`/chat/session/${sessionId}/assign`, {
      method: "POST",
    });
  }

  async getMySessions() {
    return this.request("/chat/sessions/my");
  }

  async getMessages(sessionId, afterTimestamp = null) {
    const url = afterTimestamp
      ? `/chat/messages/${sessionId}?after=${encodeURIComponent(
          afterTimestamp
        )}`
      : `/chat/messages/${sessionId}`;
    return this.request(url);
  }

  async sendMessage(sessionId, message) {
    return this.request("/chat/messages", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, message }),
    });
  }

  async closeSession(sessionId) {
    return this.request(`/chat/session/${sessionId}/close`, {
      method: "POST",
    });
  }

  // Favorites
  async addFavorite(contactId) {
    return this.request("/favorites", {
      method: "POST",
      body: JSON.stringify({ contact_id: contactId }),
    });
  }

  async removeFavorite(contactId) {
    return this.request(`/favorites/${contactId}`, { method: "DELETE" });
  }

  async getFavorites() {
    return this.request("/favorites");
  }
}

// Global API instance
const API = new EmergencyAPI();

// Auth helpers
function isAuthenticated() {
  return !!localStorage.getItem("token");
}

// Helper function to get current user
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Helper function to require authentication
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "index.html";

    return false;
  }
  return true;
}

// Helper function to check if user is admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === "admin";
}

// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Helper function to show notification
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-slide-in ${
    type === "success" ? "bg-green-500" : "bg-red-500"
  } text-white`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === "success" ? "check-circle" : "exclamation-circle"
        } mr-2"></i>
        ${message}
    `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(400px)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
