document.addEventListener('DOMContentLoaded', () => {
    console.log('Página de login cargada');
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulario de login enviado');

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            console.log('Datos del formulario:', { email });
            console.log('Iniciando proceso de login...');

            const response = await authService.login(email, password);
            console.log('Login completado:', {
                success: true,
                hasToken: !!response.token
            });

            if (response.token) {
                console.log('Redirigiendo a la página principal...');
                window.location.href = '/Frontend/index.html';
            }
        } catch (error) {
            console.error('Error en el proceso de login:', {
                message: error.message,
                stack: error.stack
            });
            alert('Error al iniciar sesión: ' + error.message);
        }
    });
}); 