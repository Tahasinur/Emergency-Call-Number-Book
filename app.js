class EmergencyApp {
    constructor() {
        this.currentUser = null;
        this.services = [];
        this.userLocation = null;
        this.apiBase = 'http://localhost:3000/api';
        this.init();
    }
    
    async init() {
        this.checkAuth();
        await this.loadServices();
        this.setupEventListeners();
        this.getUserLocation();
    }
    
    // API call method for backend communication
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('auth_token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            ...options
        };

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    checkAuth() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user_data');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.showUserDashboard();
        } else {
            this.showLoginForm();
        }
    }
    
    async loadServices(category = 'all', search = '') {
        try {
            const params = new URLSearchParams();
            if (category !== 'all') params.append('category', category);
            if (search) params.append('search', search);
            
            const result = await this.apiCall(`/services?${params.toString()}`);
            this.services = result; // API returns array directly
            this.renderServices();
        } catch (error) {
            console.error('Failed to load services:', error);
            this.showNotification('Failed to load services', 'error');
        }
    }
    
    renderServices() {
        const container = document.getElementById('services-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.services.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                    <p class="text-gray-500 text-lg">No services found</p>
                </div>
            `;
            return;
        }
        
        this.services.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });
    }
    
    createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1';
    
    const categoryColors = {
        police: 'bg-blue-500',
        fire: 'bg-red-500',
        health: 'bg-green-500',
        govt: 'bg-purple-500',
        electric: 'bg-yellow-500'
    };
    
    const categoryIcons = {
        police: 'fas fa-shield-alt',
        fire: 'fas fa-fire',
        health: 'fas fa-hospital',
        govt: 'fas fa-landmark',
        electric: 'fas fa-bolt'
    };
    
    // Use correct database column names
    const serviceId = service.contact_id || service.service_id; // Handle both possibilities
    const serviceName = service.service_name;
    const description = service.description || service.service_description || 'Emergency Service';
    
    card.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 ${categoryColors[service.category] || 'bg-gray-500'} rounded-lg flex items-center justify-center">
                        <i class="${categoryIcons[service.category] || 'fas fa-phone'} text-white"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-gray-900">${serviceName}</h3>
                        <p class="text-gray-600 text-sm">${description}</p>
                    </div>
                </div>
                <button class="favorite-btn text-gray-400 hover:text-red-500 transition duration-200" data-service-id="${serviceId}">
                    <i class="far fa-heart text-xl"></i>
                </button>
            </div>
            
            <div class="mb-4">
                <p class="text-2xl font-bold text-gray-800">${service.phone_number}</p>
                <span class="inline-block px-2 py-1 ${categoryColors[service.category] || 'bg-gray-500'} text-white text-xs rounded uppercase">
                    ${service.category}
                </span>
            </div>
            
            <div class="flex space-x-2">
                <button class="copy-btn flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors" data-number="${service.phone_number}">
                    <i class="fas fa-copy mr-2"></i>Copy
                </button>
                <button class="message-btn flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors" data-service-id="${serviceId}">
                    <i class="fas fa-comment mr-2"></i>Message
                </button>
                <button class="call-btn flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors" data-service-id="${serviceId}" data-number="${service.phone_number}">
                    <i class="fas fa-phone mr-2"></i>Call
                </button>
            </div>
        </div>
    `;
    
    return card;
}

    // === AUTHENTICATION METHODS ===
    
    showLoginForm() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
                    <div class="text-center">
                        <div class="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-phone-alt text-red-600 text-2xl"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Emergency Hotline</h2>
                        <p class="mt-2 text-gray-600">Sign in to access emergency services</p>
                    </div>
                    
                    <form id="login-form" class="mt-8 space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input id="email" type="email" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                   placeholder="Enter your email" value="user@test.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input id="password" type="password" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                   placeholder="Enter your password" value="password123">
                        </div>
                        <div>
                            <button type="submit" 
                                    class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                                <i class="fas fa-sign-in-alt mr-2"></i>Sign In
                            </button>
                        </div>
                        <div class="text-center">
                            <button type="button" id="show-register" class="text-red-600 hover:text-red-500 font-medium">
                                Don't have an account? Register here
                            </button>
                        </div>
                    </form>
                    
                    <!-- Demo Credentials -->
                    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">Demo Credentials:</h4>
                        <div class="text-sm text-gray-600 space-y-1">
                            <p><strong>Test User:</strong> user@test.com / password123</p>
                            <p><strong>Admin:</strong> admin@test.com / admin123</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('show-register').addEventListener('click', this.showRegisterForm.bind(this));
    }

    showRegisterForm() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl">
                    <div class="text-center">
                        <div class="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <i class="fas fa-user-plus text-green-600 text-2xl"></i>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Create Account</h2>
                        <p class="mt-2 text-gray-600">Join our emergency response network</p>
                    </div>
                    
                    <form id="register-form" class="mt-8 space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input id="username" type="text" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                   placeholder="Enter your username">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input id="reg-email" type="email" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                   placeholder="Enter your email">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input id="reg-password" type="password" required 
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                   placeholder="Create a password">
                        </div>
                        <div>
                            <button type="submit" 
                                    class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                                <i class="fas fa-user-plus mr-2"></i>Create Account
                            </button>
                        </div>
                        <div class="text-center">
                            <button type="button" id="show-login" class="text-green-600 hover:text-green-500 font-medium">
                                Already have an account? Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('register-form').addEventListener('submit', this.handleRegister.bind(this));
        document.getElementById('show-login').addEventListener('click', this.showLoginForm.bind(this));
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const result = await this.apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('user_data', JSON.stringify(result.user));
            this.currentUser = result.user;
            this.showNotification('Login successful!', 'success');
            this.showUserDashboard();
        } catch (error) {
            this.showNotification(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
        };

        try {
            const result = await this.apiCall('/register', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.showNotification('Registration successful! Please login.', 'success');
            this.showLoginForm();
        } catch (error) {
            this.showNotification(error.message || 'Registration failed', 'error');
        }
    }

    showUserDashboard() {
        const mainContent = document.getElementById('main-content');

        mainContent.innerHTML = `
            <div class="min-h-screen bg-gray-50">
                <nav class="bg-white shadow-sm border-b sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center h-16">
                            <div class="flex items-center space-x-4">
                                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-phone-alt text-red-600"></i>
                                </div>
                                <h1 class="text-xl font-bold text-gray-900">Emergency Hotline</h1>
                            </div>
                            
                            <div class="flex items-center space-x-4">
                                <div class="flex items-center space-x-3">
                                    <div class="flex items-center space-x-2 bg-red-50 px-3 py-1 rounded-full">
                                        <i class="fas fa-heart text-red-500"></i>
                                        <span id="love-count" class="font-semibold">${this.currentUser?.love_count || 0}</span>
                                    </div>
                                    <div class="flex items-center space-x-2 bg-yellow-50 px-3 py-1 rounded-full">
                                        <i class="fas fa-coins text-yellow-500"></i>
                                        <span id="coin-count" class="font-semibold">${this.currentUser?.coin_balance || 100}</span>
                                    </div>
                                    <div class="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                                        <i class="fas fa-copy text-blue-500"></i>
                                        <span id="copy-count" class="font-semibold">${this.currentUser?.copy_count || 0}</span>
                                    </div>
                                </div>
                                
                                <button id="emergency-btn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition duration-200 pulse-animation">
                                    <i class="fas fa-exclamation-triangle mr-2"></i>EMERGENCY
                                </button>
                                
                                <div class="relative">
                                    <button id="user-menu" class="flex items-center space-x-2 text-gray-700 hover:text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">
                                        <i class="fas fa-user"></i>
                                        <span>${this.currentUser?.username || 'User'}</span>
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 border">
                                        <button id="logout-btn" class="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
                                            <i class="fas fa-sign-out-alt mr-2"></i>Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div class="mb-8">
                        <div class="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 mb-6">
                            <div class="flex-1">
                                <div class="relative">
                                    <input id="search-input" type="text" placeholder="Search emergency services..." 
                                           class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                </div>
                            </div>
                            <button class="category-btn px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition duration-200" data-category="all">
                                <i class="fas fa-list mr-2"></i>All Services
                            </button>
                        </div>
                        
                        <div class="flex flex-wrap gap-3">
                            <button class="category-btn px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition duration-200" data-category="police">
                                <i class="fas fa-shield-alt mr-2"></i>Police
                            </button>
                            <button class="category-btn px-4 py-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition duration-200" data-category="fire">
                                <i class="fas fa-fire mr-2"></i>Fire
                            </button>
                            <button class="category-btn px-4 py-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition duration-200" data-category="health">
                                <i class="fas fa-hospital mr-2"></i>Health
                            </button>
                            <button class="category-btn px-4 py-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition duration-200" data-category="govt">
                                <i class="fas fa-landmark mr-2"></i>Government
                            </button>
                            <button class="category-btn px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition duration-200" data-category="electric">
                                <i class="fas fa-bolt mr-2"></i>Utility
                            </button>
                        </div>
                    </div>

                    <div id="services-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Services will be loaded here dynamically -->
                    </div>
                </div>
            </div>
            
            <style>
                .pulse-animation {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            </style>
        `;

        this.setupEventListeners();
        this.loadServices();
    }

    // === EVENT HANDLERS ===

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.loadServices('all', e.target.value);
            });
        }
        
        // Category filter
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.loadServices(category);
            });
        });
        
        // Service card actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.call-btn')) {
                this.handleCall(e.target.closest('.call-btn'));
            } else if (e.target.closest('.message-btn')) {
                this.handleMessage(e.target.closest('.message-btn'));
            } else if (e.target.closest('.copy-btn')) {
                this.handleCopy(e.target.closest('.copy-btn'));
            } else if (e.target.closest('.favorite-btn')) {
                this.handleFavorite(e.target.closest('.favorite-btn'));
            }
        });
        
        // Emergency button
        const emergencyBtn = document.getElementById('emergency-btn');
        if (emergencyBtn) {
            emergencyBtn.addEventListener('click', () => {
                this.handleEmergency();
            });
        }
        
        // User menu dropdown
        const userMenu = document.getElementById('user-menu');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenu && userDropdown) {
            userMenu.addEventListener('click', () => {
                userDropdown.classList.toggle('hidden');
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout.bind(this));
        }
    }

    async handleCall(btn) {
        const serviceId = btn.dataset.serviceId;
        const number = btn.dataset.number;
        
        if (!this.currentUser) {
            this.showLoginForm();
            return;
        }
        
        try {
            btn.classList.add('animate-pulse');
            
            const location = await this.getCurrentLocation();
            
            // Record call via API
            await this.apiCall('/call', {
                method: 'POST',
                body: JSON.stringify({
                    service_id: parseInt(serviceId),
                    user_lat: location?.lat,
                    user_lng: location?.lng
                })
            });
            
            // Update user stats
            await this.updateUserStats();
            
            setTimeout(() => {
                window.open(`tel:${number}`, '_self');
                this.showNotification(`Calling ${number}...`, 'success');
                btn.classList.remove('animate-pulse');
            }, 1000);
            
        } catch (error) {
            this.showNotification(error.message || 'Call failed', 'error');
            btn.classList.remove('animate-pulse');
        }
    }

    async handleEmergency() {
        const confirmed = confirm('🚨 EMERGENCY ALERT 🚨\n\nThis will:\n• Call emergency services\n• Share your location\n• Alert authorities\n\nConfirm emergency?');
        
        if (!confirmed) return;
        
        try {
            const location = await this.getCurrentLocation();
            
            // Record emergency via API
            await this.apiCall('/emergency', {
                method: 'POST',
                body: JSON.stringify({
                    incident_type: 'general_emergency',
                    user_lat: location?.lat,
                    user_lng: location?.lng
                })
            });
            
            this.showNotification('🚨 Emergency alert sent! Calling 999...', 'error');
            
            setTimeout(() => {
                window.open('tel:999', '_self');
            }, 1000);
            
        } catch (error) {
            this.showNotification('🚨 Emergency call initiated!', 'error');
            window.open('tel:999', '_self');
        }
    }

    async handleCopy(btn) {
        const number = btn.dataset.number;
        
        try {
            await navigator.clipboard.writeText(number);
            
            // Update copy count via API
            await this.apiCall('/copy', { method: 'POST' });
            
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
            btn.classList.add('bg-green-500', 'text-white');
            
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copy';
                btn.classList.remove('bg-green-500', 'text-white');
            }, 2000);
            
            this.showNotification(`Copied: ${number}`, 'success');
            this.updateUserStats();
        } catch (error) {
            this.showNotification('Failed to copy number', 'error');
        }
    }

    handleMessage(btn) {
        this.showNotification('📱 Messaging feature coming soon!', 'info');
    }

    async handleFavorite(btn) {
        const serviceId = btn.dataset.serviceId;
        const icon = btn.querySelector('i');
        
        try {
            await this.apiCall('/favorite', { method: 'POST' });
            
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                btn.classList.add('text-red-500');
                this.showNotification('Added to favorites! ❤️', 'success');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                btn.classList.remove('text-red-500');
                this.showNotification('Removed from favorites', 'info');
            }
            
            this.updateUserStats();
        } catch (error) {
            this.showNotification('Failed to update favorites', 'error');
        }
    }

    // === UTILITY METHODS ===

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Geolocation not supported');
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                error => resolve(null) // Don't fail if location unavailable
            );
        });
    }

    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                },
                error => console.log('Location access denied')
            );
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transform transition-all duration-300 translate-x-full`;
        
        switch(type) {
            case 'success':
                notification.classList.add('bg-green-500');
                break;
            case 'error':
                notification.classList.add('bg-red-500');
                break;
            case 'info':
                notification.classList.add('bg-blue-500');
                break;
            default:
                notification.classList.add('bg-gray-500');
        }
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async updateUserStats() {
        try {
            const result = await this.apiCall('/user');
            
            // Update display
            const loveElement = document.getElementById('love-count');
            const coinElement = document.getElementById('coin-count');
            const copyElement = document.getElementById('copy-count');
            
            if (loveElement) loveElement.textContent = result.love_count || 0;
            if (coinElement) coinElement.textContent = result.coin_balance || 0;
            if (copyElement) copyElement.textContent = result.copy_count || 0;
            
            // Update current user data
            this.currentUser = { ...this.currentUser, ...result };
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            
        } catch (error) {
            console.error('Failed to update user stats:', error);
        }
    }

    async logout() {
        try {
            await this.apiCall('/logout', { method: 'POST' });
        } catch (error) {
            console.log('Logout API call failed, logging out locally');
        }
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        this.currentUser = null;
        this.showNotification('Logged out successfully!', 'info');
        this.showLoginForm();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EmergencyApp();
});