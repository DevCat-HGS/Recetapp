document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registro-form');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('fa-eye');
        togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Handle registration form submission
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await authService.registro(nombre, email, password);
            if (response.mensaje) {
                alert('¡Registro exitoso! Por favor, inicia sesión.');
                window.location.href = 'login.html';
            }
        } catch (error) {
            alert('Error al registrarse: ' + error.message);
        }
    });
}); 