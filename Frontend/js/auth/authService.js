class AuthService {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
        this.checkAuthState();
    }

    // Verificar el estado de autenticación
    async checkAuthState() {
        try {
            if (this.token) {
                const response = await fetch(`${this.baseUrl}/usuarios/verify`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (!response.ok) {
                    this.logout();
                    return false;
                }

                // Token válido, actualizar UI
                this.updateAuthUI(true);
                return true;
            } else {
                this.updateAuthUI(false);
                return false;
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.logout();
            return false;
        }
    }

    // Actualizar la UI basada en el estado de autenticación
    updateAuthUI(isAuthenticated) {
        const authButtons = document.querySelectorAll('.auth-buttons');
        const userMenu = document.querySelectorAll('.user-menu');
        const userName = document.querySelectorAll('.user-name');

        if (isAuthenticated && this.user) {
            // Mostrar menú de usuario y ocultar botones de auth
            authButtons.forEach(el => el.style.display = 'none');
            userMenu.forEach(el => el.style.display = 'flex');
            userName.forEach(el => el.textContent = this.user.nombre);
        } else {
            // Mostrar botones de auth y ocultar menú de usuario
            authButtons.forEach(el => el.style.display = 'flex');
            userMenu.forEach(el => el.style.display = 'none');
        }
    }

    async login(email, password) {
        try {
            console.log('Intentando login con:', { email }); // Para debug

            const response = await fetch(`${this.baseUrl}/usuarios/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: email.trim(),
                    password: password
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.mensaje || 'Error en el inicio de sesión');
            }
            
            if (data.token) {
                this.token = data.token;
                this.user = data.usuario;
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.usuario));
                this.updateAuthUI(true);
                return data;
            } else {
                throw new Error('No se recibió el token de autenticación');
            }
        } catch (error) {
            console.error('Error detallado:', error);
            throw error;
        }
    }

    async registro(nombre, email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/usuarios/registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre, email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                return data;
            } else {
                throw new Error(data.mensaje || 'Error en el registro');
            }
        } catch (error) {
            throw error;
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateAuthUI(false);
        // Redirigir a la raíz del sitio
        window.location.href = '/Frontend/index.html';
    }

    isAuthenticated() {
        return !!this.token;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.logout();
            return null;
        }
        return token;
    }
}

// Crear instancia global
const authService = new AuthService();

// Verificar autenticación en cada carga de página
document.addEventListener('DOMContentLoaded', () => {
    authService.checkAuthState();
});