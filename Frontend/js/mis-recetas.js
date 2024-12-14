document.addEventListener('DOMContentLoaded', async () => {
    if (!authService.isAuthenticated()) {
        window.location.href = '/Frontend/pages/login.html';
        return;
    }

    const user = authService.getUser();
    const recipesGrid = document.querySelector('.recipes-grid');
    const searchInput = document.getElementById('search-recipe');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');

    let userRecipes = [];

    // Cargar categorías
    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/api/categorias');
            const categories = await response.json();
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_categoria;
                option.textContent = category.nombre;
                categoryFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    // Cargar estadísticas
    async function loadStats() {
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id_usuario}/recetas/stats`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });
            const stats = await response.json();
            
            document.getElementById('total-recipes').textContent = stats.total;
            document.getElementById('best-rated').textContent = stats.bestRated || '-';
            document.getElementById('latest-recipe').textContent = stats.latest || '-';
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }

    // Cargar recetas
    async function loadRecipes() {
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id_usuario}/recetas`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });
            userRecipes = await response.json();
            renderRecipes(userRecipes);
        } catch (error) {
            console.error('Error al cargar recetas:', error);
            recipesGrid.innerHTML = '<p class="error-message">Error al cargar las recetas</p>';
        }
    }

    // Renderizar recetas
    function renderRecipes(recipes) {
        recipesGrid.innerHTML = recipes.map(recipe => `
            <div class="recipe-card">
                <div class="recipe-image">
                    <img src="${recipe.imagen || '../img/3.jpg'}" alt="${recipe.nombre}">
                </div>
                <div class="recipe-content">
                    <h3>${recipe.nombre}</h3>
                    <div class="recipe-meta">
                        <span><i class="fas fa-clock"></i> ${recipe.tiempo_preparacion} min</span>
                        <span><i class="fas fa-signal"></i> ${recipe.dificultad}</span>
                    </div>
                    <p>${recipe.descripcion.substring(0, 100)}...</p>
                    <div class="recipe-actions">
                        <button onclick="editarReceta(${recipe.id_receta})" class="action-btn edit-btn">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="eliminarReceta(${recipe.id_receta})" class="action-btn delete-btn">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Filtrar recetas
    function filterRecipes() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryValue = categoryFilter.value;
        const difficultyValue = difficultyFilter.value;

        const filteredRecipes = userRecipes.filter(recipe => {
            const matchesSearch = recipe.nombre.toLowerCase().includes(searchTerm) ||
                                recipe.descripcion.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryValue || recipe.id_categoria === parseInt(categoryValue);
            const matchesDifficulty = !difficultyValue || recipe.dificultad === difficultyValue;

            return matchesSearch && matchesCategory && matchesDifficulty;
        });

        renderRecipes(filteredRecipes);
    }

    // Event listeners para filtros
    searchInput.addEventListener('input', filterRecipes);
    categoryFilter.addEventListener('change', filterRecipes);
    difficultyFilter.addEventListener('change', filterRecipes);

    // Inicializar página
    await loadCategories();
    await loadStats();
    await loadRecipes();
});

// Funciones para editar y eliminar recetas
function editarReceta(id) {
    window.location.href = `/Frontend/pages/editar-receta.html?id=${id}`;
}

async function eliminarReceta(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta receta?')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/recetas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authService.getToken()}`
            }
        });

        if (!response.ok) throw new Error('Error al eliminar la receta');

        alert('Receta eliminada exitosamente');
        location.reload();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la receta');
    }
} 