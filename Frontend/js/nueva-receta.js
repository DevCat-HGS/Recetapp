document.addEventListener('DOMContentLoaded', async () => {
    if (!authService.isAuthenticated()) {
        window.location.href = '/Frontend/pages/login.html';
        return;
    }

    const form = document.getElementById('nueva-receta-form');
    const addIngredienteBtn = document.getElementById('add-ingrediente');
    const addPasoBtn = document.getElementById('add-paso');
    const ingredientesContainer = document.getElementById('ingredientes-container');
    const pasosContainer = document.getElementById('pasos-container');

    // Cargar categorías
    async function loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/api/categorias');
            const categories = await response.json();
            const selectCategoria = document.getElementById('categoria');
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id_categoria;
                option.textContent = category.nombre;
                selectCategoria.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            alert('Error al cargar las categorías');
        }
    }

    // Añadir ingrediente
    function addIngrediente() {
        const div = document.createElement('div');
        div.className = 'ingrediente-item';
        div.innerHTML = `
            <input type="text" placeholder="Ingrediente" class="ingrediente-nombre" required>
            <input type="text" placeholder="Cantidad" class="ingrediente-cantidad" required>
            <button type="button" class="remove-ingrediente">
                <i class="fas fa-times"></i>
            </button>
        `;
        ingredientesContainer.appendChild(div);

        div.querySelector('.remove-ingrediente').addEventListener('click', () => {
            div.remove();
        });
    }

    // Añadir paso
    function addPaso() {
        const div = document.createElement('div');
        div.className = 'paso-item';
        div.innerHTML = `
            <span class="paso-numero">${pasosContainer.children.length + 1}</span>
            <textarea placeholder="Describe este paso" class="paso-descripcion" required></textarea>
            <button type="button" class="remove-paso">
                <i class="fas fa-times"></i>
            </button>
        `;
        pasosContainer.appendChild(div);

        div.querySelector('.remove-paso').addEventListener('click', () => {
            div.remove();
            actualizarNumerosPasos();
        });
    }

    // Actualizar números de pasos
    function actualizarNumerosPasos() {
        const pasos = pasosContainer.querySelectorAll('.paso-item');
        pasos.forEach((paso, index) => {
            paso.querySelector('.paso-numero').textContent = index + 1;
        });
    }

    // Event listeners
    addIngredienteBtn.addEventListener('click', addIngrediente);
    addPasoBtn.addEventListener('click', addPaso);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ingredientes = Array.from(ingredientesContainer.querySelectorAll('.ingrediente-item')).map(item => ({
            nombre: item.querySelector('.ingrediente-nombre').value,
            cantidad: item.querySelector('.ingrediente-cantidad').value
        }));

        const pasos = Array.from(pasosContainer.querySelectorAll('.paso-descripcion')).map(paso => paso.value);

        const recetaData = {
            nombre: document.getElementById('nombre').value,
            descripcion: document.getElementById('descripcion').value,
            id_categoria: document.getElementById('categoria').value,
            dificultad: document.getElementById('dificultad').value,
            tiempo_preparacion: document.getElementById('tiempo').value,
            imagen: document.getElementById('imagen').value,
            ingredientes: ingredientes,
            pasos: pasos
        };

        try {
            const response = await fetch('http://localhost:3000/api/recetas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authService.getToken()}`
                },
                body: JSON.stringify(recetaData)
            });

            if (!response.ok) {
                throw new Error('Error al crear la receta');
            }

            alert('¡Receta creada exitosamente!');
            window.location.href = 'mis-recetas.html';
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear la receta');
        }
    });

    // Inicializar
    await loadCategories();
    addIngrediente(); // Añadir primer ingrediente
    addPaso(); // Añadir primer paso
}); 