class RecipeService {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        console.log('RecipeService inicializado');
    }

    async uploadRecipe(recipe) {
        console.log('Iniciando subida de receta:', recipe);
        const token = authService.getToken();
        console.log('Token disponible:', !!token);

        if (!token) {
            console.warn('Intento de subir receta sin autenticación');
            throw new Error('Usuario no autenticado');
        }

        try {
            console.log('Enviando petición al servidor...');
            const response = await fetch(`${this.baseUrl}/recetas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...recipe,
                    id_usuario: authService.getUser()?.id_usuario
                })
            });

            console.log('Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Error en la respuesta:', error);
                throw new Error(error.mensaje || 'Error al crear la receta');
            }

            const data = await response.json();
            console.log('Receta creada exitosamente:', data);
            return data;
        } catch (error) {
            console.error('Error en uploadRecipe:', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async getRecetas(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${this.baseUrl}/recetas`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error(response.statusText);
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    renderRecipeCard(receta) {
        // Convertir nivel de dificultad a iconos
        const getDifficultyStars = (dificultad) => {
            switch(dificultad) {
                case 'Fácil': return '⭐';
                case 'Intermedia': return '⭐⭐';
                case 'Difícil': return '⭐⭐⭐';
                default: return '⭐';
            }
        };

        return `
            <div class="recipe-card">
                <div class="recipe-image">
                    <img src="${receta.imagen || '../img/3.jpg'}" 
                         alt="${receta.nombre}" 
                         onerror="this.src='https://via.placeholder.com/300x200?text=Receta'">
                </div>
                <div class="recipe-content">
                    <h3>${receta.nombre}</h3>
                    <p>${receta.descripcion || 'Sin descripción disponible'}</p>
                    <div class="recipe-meta">
                        <span class="time">
                            <i class="fas fa-clock"></i> 
                            ${receta.tiempo_preparacion || '30'} min
                        </span>
                        <span class="difficulty">
                            <i class="fas fa-signal"></i> 
                            ${getDifficultyStars(receta.dificultad)}
                        </span>
                    </div>
                    <button class="recipe-btn" onclick="verReceta(${receta.id_receta})">
                        Ver Receta
                    </button>
                </div>
            </div>
        `;
    }

    async getCategories() {
        try {
            console.log('Obteniendo categorías...');
            const response = await fetch(`${this.baseUrl}/categorias`);
            if (!response.ok) {
                throw new Error('Error al obtener las categorías');
            }
            const categories = await response.json();
            console.log('Categorías obtenidas:', categories);
            return categories;
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            throw error;
        }
    }

    async getRecetas(filters = {}) {
        try {
            const query = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseUrl}/recetas?${query}`);
            if (!response.ok) {
                throw new Error('Error al obtener las recetas');
            }
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async uploadRecipe(recipe) {
        try {
            const token = authService.getToken();
            
            if (!token) {
                throw new Error('No hay sesión activa. Por favor, inicia sesión.');
            }

            console.log('Token siendo enviado:', token); // Para debugging

            const response = await fetch(`${this.baseUrl}/recetas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...recipe,
                    id_usuario: authService.getUser().id_usuario
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.mensaje || 'Error al subir la receta');
            }

            return await response.json();
        } catch (error) {
            console.error('Error en uploadRecipe:', error);
            throw error;
        }
    }

    // Método para verificar autenticación antes de mostrar el formulario
    checkAuthBeforeUpload() {
        if (!authService.isAuthenticated()) {
            alert('Debes iniciar sesión para subir recetas');
            window.location.href = '/Frontend/pages/login.html';
            return false;
        }
        return true;
    }
}

// Función para ver el detalle de una receta
function verReceta(id) {
    window.location.href = `/pages/receta.html?id=${id}`;
}

// Inicializar el servicio
const recipeService = new RecipeService();
console.log('RecipeService instanciado globalmente');

// Cargar recetas destacadas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const recipeGrid = document.querySelector('.recipe-grid');
    
    if (recipeGrid) {
        try {
            // Mostrar indicador de carga
            recipeGrid.innerHTML = '<div class="loading">Cargando recetas...</div>';
            
            // Obtener las recetas
            const recetas = await recipeService.getRecetas();
            
            // Mostrar las primeras 6 recetas
            const recetasDestacadas = recetas.slice(0, 6);
            
            // Actualizar el grid con las recetas
            recipeGrid.innerHTML = recetasDestacadas
                .map(receta => recipeService.renderRecipeCard(receta))
                .join('');
                
        } catch (error) {
            recipeGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Error al cargar las recetas. Por favor, intenta más tarde.
                </div>`;
            console.error('Error al cargar recetas:', error);
        }
    }
}); 