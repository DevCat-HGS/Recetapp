document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si el usuario está autenticado
    if (!authService.isAuthenticated()) {
        window.location.href = '/Frontend/pages/login.html';
        return;
    }

    const profileForm = document.getElementById('profile-form');
    const recipeGrid = document.querySelector('.recipe-grid');
    const user = authService.getUser();

    // Cargar información del usuario
    function loadUserInfo() {
        document.getElementById('nombre').value = user.nombre;
        document.getElementById('email').value = user.email;
    }

    // Cargar recetas del usuario
    async function loadUserRecipes() {
        try {
            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id_usuario}/recetas`, {
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`
                }
            });

            if (!response.ok) throw new Error('Error al cargar las recetas');

            const recetas = await response.json();
            recipeGrid.innerHTML = recetas.map(receta => `
                <div class="recipe-card">
                    <div class="recipe-image">
                        <img src="${receta.imagen || '../img/3.jpg'}" alt="${receta.nombre}">
                    </div>
                    <div class="recipe-content">
                        <h3>${receta.nombre}</h3>
                        <p>${receta.descripcion}</p>
                        <div class="recipe-actions">
                            <button onclick="editarReceta(${receta.id_receta})" class="edit-btn">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button onclick="eliminarReceta(${receta.id_receta})" class="delete-btn">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error:', error);
            recipeGrid.innerHTML = '<p>Error al cargar las recetas</p>';
        }
    }

    // Manejar actualización del perfil
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                nombre: document.getElementById('nombre').value,
                email: document.getElementById('email').value
            };

            const response = await fetch(`http://localhost:3000/api/usuarios/${user.id_usuario}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authService.getToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Error al actualizar el perfil');

            const data = await response.json();
            alert('Perfil actualizado exitosamente');
            
            // Actualizar información del usuario en el localStorage
            const updatedUser = { ...user, ...formData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar el perfil');
        }
    });

    // Cargar datos iniciales
    loadUserInfo();
    await loadUserRecipes();
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