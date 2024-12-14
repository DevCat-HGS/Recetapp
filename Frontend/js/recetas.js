document.addEventListener('DOMContentLoaded', async () => {
    const recipeGrid = document.querySelector('.recipe-grid');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const uploadRecipeSection = document.getElementById('upload-recipe-section');
    const uploadRecipeForm = document.getElementById('upload-recipe-form');

    const authService = new AuthService();
    const recipeService = new RecipeService();

    // Mostrar u ocultar la sección de subir recetas según autenticación
    if (authService.isAuthenticated()) {
        uploadRecipeSection.style.display = 'block';
    } else {
        uploadRecipeSection.style.display = 'none';
    }

    // Cargar categorías para el filtro y el formulario
    async function loadCategories() {
        try {
            const categories = await recipeService.getCategories();
            // Limpiar las opciones existentes excepto la primera
            categoryFilter.innerHTML = '<option value="">Todas las Categorías</option>';
            document.getElementById('recipe-category').innerHTML = '<option value="">Selecciona una Categoría</option>';

            categories.forEach(category => {
                // Para el filtro
                const option = document.createElement('option');
                option.value = category.id_categoria;
                option.textContent = category.nombre;
                categoryFilter.appendChild(option);

                // Para el formulario de subida
                const formOption = option.cloneNode(true);
                document.getElementById('recipe-category').appendChild(formOption);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            alert('Error al cargar las categorías');
        }
    }

    // Cargar recetas con filtros
    async function loadRecipes() {
        try {
            const category = categoryFilter.value;
            const difficulty = difficultyFilter.value;
            const recetas = await recipeService.getRecetas({ category, difficulty });
            recipeGrid.innerHTML = recetas.map(receta => recipeService.renderRecipeCard(receta)).join('');
        } catch (error) {
            console.error('Error al cargar recetas:', error);
            recipeGrid.innerHTML = '<p>Error al cargar las recetas</p>';
        }
    }

    if (uploadRecipeForm) {
        uploadRecipeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Verificar autenticación antes de proceder
            if (!recipeService.checkAuthBeforeUpload()) {
                return;
            }

            // Obtener los valores directamente de los elementos
            const newRecipe = {
                nombre: document.getElementById('recipe-name').value.trim(),
                descripcion: document.getElementById('recipe-description').value.trim(),
                tiempo_preparacion: document.getElementById('recipe-time').value.trim(),
                id_categoria: document.getElementById('recipe-category').value.trim(),
                dificultad: document.getElementById('recipe-difficulty').value.trim()
            };

            // Verificar que todos los campos estén llenos
            if (!newRecipe.nombre || !newRecipe.descripcion || !newRecipe.tiempo_preparacion || 
                !newRecipe.id_categoria || !newRecipe.dificultad) {
                alert('Por favor, completa todos los campos');
                return;
            }

            console.log('Datos de la receta a enviar:', newRecipe);

            try {
                const response = await recipeService.uploadRecipe(newRecipe);
                alert('¡Receta subida exitosamente!');
                uploadRecipeForm.reset();
                await loadRecipes(); // Recargar la lista de recetas
            } catch (error) {
                console.error('Error al subir receta:', error);
                if (error.message.includes('sesión')) {
                    // Si el error es de autenticación, redirigir al login
                    window.location.href = '/Frontend/pages/login.html';
                } else {
                    alert('Error al subir la receta: ' + error.message);
                }
            }
        });
    }

    // Llamar a loadCategories al inicio
    await loadCategories();
    await loadRecipes();
}); 