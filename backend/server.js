require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET_KEY = process.env.JWT_SECRET || '0106';
const app = express();
const path = require('path');

// Configuración más permisiva de CORS
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Middleware adicional para manejar OPTIONS
app.options('*', cors());

// Asegurarse de que express.json() esté después de CORS
app.use(express.json());

const sanitizeInput = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }
    next();
};

app.use(sanitizeInput);

// Configuración de la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'recetas',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

// Función helper para transacciones
const executeTransaction = async (queries) => {
    try {
        await db.beginTransaction();
        const results = await Promise.all(queries);
        await db.commit();
        return results;
    } catch (error) {
        await db.rollback();
        throw error;
    }
};

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    try {
        const bearerHeader = req.headers['authorization'];
        
        if (!bearerHeader) {
            return res.status(401).json({ mensaje: 'Token no proporcionado' });
        }

        const bearer = bearerHeader.split(' ');
        if (bearer.length !== 2 || bearer[0] !== 'Bearer') {
            return res.status(401).json({ mensaje: 'Formato de token inválido' });
        }

        const token = bearer[1];
        
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ mensaje: 'Token expirado' });
                }
                return res.status(401).json({ mensaje: 'Token inválido' });
            }
            req.user = decoded;
            next();
        });
    } catch (error) {
        res.status(401).json({ mensaje: 'Error en la autenticación' });
    }
};

// Proteger rutas que requieren autenticación
app.post('/api/recetas', verifyToken, async (req, res) => {
    try {
        const { nombre, descripcion, id_categoria, tiempo_preparacion, dificultad, ingredientes } = req.body;
        
        // Validaciones
        if (!nombre || !descripcion || !id_categoria || !tiempo_preparacion || !dificultad) {
            return res.status(400).json({ mensaje: 'Todos los campos son requeridos' });
        }
        
        if (tiempo_preparacion <= 0) {
            return res.status(400).json({ mensaje: 'El tiempo de preparación debe ser mayor a 0' });
        }

        // Validar que la categoría existe
        const [categoria] = await db.execute('SELECT id_categoria FROM categorias WHERE id_categoria = ?', [id_categoria]);
        if (categoria.length === 0) {
            return res.status(400).json({ mensaje: 'Categoría no válida' });
        }

        const [result] = await db.execute(
            'INSERT INTO recetas (id_usuario, id_categoria, nombre, descripcion, tiempo_preparacion, dificultad) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id_usuario, id_categoria, nombre, descripcion, tiempo_preparacion, dificultad]
        );

        if (ingredientes?.length > 0) {
            await Promise.all(ingredientes.map(ing => 
                db.execute(
                    'INSERT INTO recetas_ingredientes (id_receta, id_ingrediente, cantidad) VALUES (?, ?, ?)',
                    [result.insertId, ing.id_ingrediente, ing.cantidad]
                )
            ));
        }

        res.status(201).json({ 
            id: result.insertId, 
            mensaje: 'Receta creada exitosamente' 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// RUTAS DE USUARIOS
// Registro de usuario
app.post('/api/usuarios/registro', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // Validar campos requeridos
        if (!nombre || !email || !password) {
            return res.status(400).json({
                mensaje: 'Todos los campos son requeridos'
            });
        }

        // Verificar si el email ya existe
        const [existingUser] = await db.execute(
            'SELECT id_usuario FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                mensaje: 'El email ya está registrado'
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            mensaje: 'Usuario registrado exitosamente' 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            mensaje: 'Error al registrar usuario',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login
app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionaron email y password
        if (!email || !password) {
            return res.status(400).json({ 
                mensaje: 'Email y contraseña son requeridos' 
            });
        }

        // Buscar usuario en la base de datos
        const [usuarios] = await db.execute(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        // Verificar si el usuario existe
        if (usuarios.length === 0) {
            return res.status(401).json({ 
                mensaje: 'Email o contraseña incorrectos' 
            });
        }

        const usuario = usuarios[0];

        // Verificar la contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        
        if (!passwordValida) {
            return res.status(401).json({ 
                mensaje: 'Email o contraseña incorrectos' 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                id_usuario: usuario.id_usuario,
                email: usuario.email,
                nombre: usuario.nombre
            },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        // Enviar respuesta exitosa
        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Error detallado en login:', error);
        res.status(500).json({ 
            mensaje: 'Error en el servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Agregar una ruta de prueba para verificar la conexión
app.get('/api/test', (req, res) => {
    res.json({ mensaje: 'Conexión exitosa al servidor' });
});

// Verificar conexión a la base de datos
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos');
    connection.release();
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ 
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// RUTAS DE RECETAS
// Obtener todas las recetas
app.get('/api/recetas', async (req, res) => {
    try {
        const { categoria, dificultad } = req.query;
        let query = `
            SELECT r.*, c.nombre as categoria_nombre, u.nombre as usuario_nombre 
            FROM recetas r 
            LEFT JOIN categorias c ON r.id_categoria = c.id_categoria
            LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
            WHERE 1=1
        `;
        
        const params = [];
        if (categoria) {
            query += ' AND r.id_categoria = ?';
            params.push(categoria);
        }
        if (dificultad) {
            query += ' AND r.dificultad = ?';
            params.push(dificultad);
        }
        
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener receta por ID
app.get('/api/recetas/:id', async (req, res) => {
    try {
        const [receta] = await db.execute(
            'SELECT * FROM recetas WHERE id_receta = ?',
            [req.params.id]
        );
        
        if (receta.length === 0) {
            return res.status(404).json({ mensaje: 'Receta no encontrada' });
        }

        const [ingredientes] = await db.execute(`
            SELECT i.*, ri.cantidad 
            FROM ingredientes i 
            JOIN recetas_ingredientes ri ON i.id_ingrediente = ri.id_ingrediente 
            WHERE ri.id_receta = ?
        `, [req.params.id]);

        res.json({
            ...receta[0],
            ingredientes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RUTAS DE CATEGORÍAS
// Obtener todas las categorías
app.get('/api/categorias', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RUTAS DE VALORACIONES
// Crear valoración
app.post('/api/valoraciones', verifyToken, async (req, res) => {
    try {
        const { id_receta, puntuacion, comentario } = req.body;
        
        if (!id_receta || !puntuacion) {
            return res.status(400).json({
                mensaje: 'La receta y puntuación son requeridas'
            });
        }

        const [result] = await db.execute(
            'INSERT INTO valoraciones (id_usuario, id_receta, puntuacion, comentario) VALUES (?, ?, ?, ?)',
            [req.user.id_usuario, id_receta, puntuacion, comentario]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            mensaje: 'Valoración creada exitosamente' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener valoraciones por receta
app.get('/api/valoraciones/receta/:id_receta', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT v.*, u.nombre as usuario_nombre 
            FROM valoraciones v 
            JOIN usuarios u ON v.id_usuario = u.id_usuario 
            WHERE v.id_receta = ?
        `, [req.params.id_receta]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RUTAS DE INGREDIENTES
// Agregar ingrediente a receta
app.post('/api/recetas/:id_receta/ingredientes', verifyToken, async (req, res) => {
    try {
        const { id_ingrediente, cantidad } = req.body;
        
        if (!id_ingrediente || !cantidad) {
            return res.status(400).json({
                mensaje: 'El ingrediente y la cantidad son requeridos'
            });
        }

        await db.execute(
            'INSERT INTO recetas_ingredientes (id_receta, id_ingrediente, cantidad) VALUES (?, ?, ?)',
            [req.params.id_receta, id_ingrediente, cantidad]
        );
        
        res.status(201).json({ mensaje: 'Ingrediente agregado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO USUARIOS
// Obtener todos los usuarios
app.get('/api/usuarios', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id_usuario, nombre, email, fecha_registro FROM usuarios');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar usuario
app.put('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
        const { nombre, email } = req.body;
        
        // Verificar que el usuario solo pueda actualizar su propio perfil
        if (req.user.id_usuario !== parseInt(req.params.id)) {
            return res.status(403).json({
                mensaje: 'No autorizado para actualizar este usuario'
            });
        }

        await db.execute(
            'UPDATE usuarios SET nombre = ?, email = ? WHERE id_usuario = ?',
            [nombre, email, req.params.id]
        );
        
        res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
        // Verificar que el usuario solo pueda eliminar su propia cuenta
        if (req.user.id_usuario !== parseInt(req.params.id)) {
            return res.status(403).json({
                mensaje: 'No autorizado para eliminar este usuario'
            });
        }

        await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [req.params.id]);
        res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO CATEGORÍAS
// Crear categoría
app.post('/api/categorias', verifyToken, async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre de la categoría es requerido'
            });
        }

        const [result] = await db.execute(
            'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            mensaje: 'Categoría creada exitosamente' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener categoría por ID
app.get('/api/categorias/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM categorias WHERE id_categoria = ?', 
            [req.params.id]
        );
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar categoría
app.put('/api/categorias/:id', verifyToken, async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre de la categoría es requerido'
            });
        }

        await db.execute(
            'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?',
            [nombre, descripcion, req.params.id]
        );
        
        res.json({ mensaje: 'Categoría actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar categoría
app.delete('/api/categorias/:id', verifyToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM categorias WHERE id_categoria = ?', [req.params.id]);
        res.json({ mensaje: 'Categoría eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO RECETAS (Actualizar y Eliminar)
// Actualizar receta
app.put('/api/recetas/:id', verifyToken, async (req, res) => {
    try {
        const { id_categoria, nombre, descripcion, tiempo_preparacion, dificultad } = req.body;
        
        // Verificar que la receta pertenece al usuario
        const [receta] = await db.execute(
            'SELECT id_usuario FROM recetas WHERE id_receta = ?',
            [req.params.id]
        );

        if (receta.length === 0) {
            return res.status(404).json({
                mensaje: 'Receta no encontrada'
            });
        }

        if (receta[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para actualizar esta receta'
            });
        }

        await db.execute(
            'UPDATE recetas SET id_categoria = ?, nombre = ?, descripcion = ?, tiempo_preparacion = ?, dificultad = ? WHERE id_receta = ?',
            [id_categoria, nombre, descripcion, tiempo_preparacion, dificultad, req.params.id]
        );
        
        res.json({ mensaje: 'Receta actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar receta
app.delete('/api/recetas/:id', verifyToken, async (req, res) => {
    try {
        // Verificar que la receta pertenece al usuario
        const [receta] = await db.execute(
            'SELECT id_usuario FROM recetas WHERE id_receta = ?',
            [req.params.id]
        );

        if (receta.length === 0) {
            return res.status(404).json({
                mensaje: 'Receta no encontrada'
            });
        }

        if (receta[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para eliminar esta receta'
            });
        }

        await db.execute('DELETE FROM recetas WHERE id_receta = ?', [req.params.id]);
        res.json({ mensaje: 'Receta eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO INGREDIENTES
// Crear ingrediente
app.post('/api/ingredientes', verifyToken, async (req, res) => {
    try {
        const { nombre } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre del ingrediente es requerido'
            });
        }

        const [result] = await db.execute(
            'INSERT INTO ingredientes (nombre) VALUES (?)',
            [nombre]
        );
        
        res.status(201).json({ 
            id: result.insertId, 
            mensaje: 'Ingrediente creado exitosamente' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los ingredientes
app.get('/api/ingredientes', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM ingredientes');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener ingrediente por ID
app.get('/api/ingredientes/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM ingredientes WHERE id_ingrediente = ?', 
            [req.params.id]
        );
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ mensaje: 'Ingrediente no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar ingrediente
app.put('/api/ingredientes/:id', verifyToken, async (req, res) => {
    try {
        const { nombre } = req.body;
        
        if (!nombre) {
            return res.status(400).json({
                mensaje: 'El nombre del ingrediente es requerido'
            });
        }

        await db.execute(
            'UPDATE ingredientes SET nombre = ? WHERE id_ingrediente = ?',
            [nombre, req.params.id]
        );
        
        res.json({ mensaje: 'Ingrediente actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar ingrediente
app.delete('/api/ingredientes/:id', verifyToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM ingredientes WHERE id_ingrediente = ?', [req.params.id]);
        res.json({ mensaje: 'Ingrediente eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO VALORACIONES (Actualizar y Eliminar)
// Actualizar valoración
app.put('/api/valoraciones/:id', verifyToken, async (req, res) => {
    try {
        const { puntuacion, comentario } = req.body;
        
        // Verificar que la valoración pertenece al usuario
        const [valoracion] = await db.execute(
            'SELECT id_usuario FROM valoraciones WHERE id_valoracion = ?',
            [req.params.id]
        );

        if (valoracion.length === 0) {
            return res.status(404).json({
                mensaje: 'Valoración no encontrada'
            });
        }

        if (valoracion[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para actualizar esta valoración'
            });
        }

        await db.execute(
            'UPDATE valoraciones SET puntuacion = ?, comentario = ? WHERE id_valoracion = ?',
            [puntuacion, comentario, req.params.id]
        );
        
        res.json({ mensaje: 'Valoración actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar valoración
app.delete('/api/valoraciones/:id', verifyToken, async (req, res) => {
    try {
        // Verificar que la valoración pertenece al usuario
        const [valoracion] = await db.execute(
            'SELECT id_usuario FROM valoraciones WHERE id_valoracion = ?',
            [req.params.id]
        );

        if (valoracion.length === 0) {
            return res.status(404).json({
                mensaje: 'Valoración no encontrada'
            });
        }

        if (valoracion[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para eliminar esta valoración'
            });
        }

        await db.execute('DELETE FROM valoraciones WHERE id_valoracion = ?', [req.params.id]);
        res.json({ mensaje: 'Valoración eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CRUD COMPLETO RECETAS_INGREDIENTES
// Actualizar cantidad de ingrediente en receta
app.put('/api/recetas/:id_receta/ingredientes/:id_ingrediente', verifyToken, async (req, res) => {
    try {
        const { cantidad } = req.body;
        
        // Verificar que la receta pertenece al usuario
        const [receta] = await db.execute(
            'SELECT id_usuario FROM recetas WHERE id_receta = ?',
            [req.params.id_receta]
        );

        if (receta.length === 0) {
            return res.status(404).json({
                mensaje: 'Receta no encontrada'
            });
        }

        if (receta[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para modificar esta receta'
            });
        }

        await db.execute(
            'UPDATE recetas_ingredientes SET cantidad = ? WHERE id_receta = ? AND id_ingrediente = ?',
            [cantidad, req.params.id_receta, req.params.id_ingrediente]
        );
        
        res.json({ mensaje: 'Cantidad de ingrediente actualizada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar ingrediente de receta
app.delete('/api/recetas/:id_receta/ingredientes/:id_ingrediente', verifyToken, async (req, res) => {
    try {
        // Verificar que la receta pertenece al usuario
        const [receta] = await db.execute(
            'SELECT id_usuario FROM recetas WHERE id_receta = ?',
            [req.params.id_receta]
        );

        if (receta.length === 0) {
            return res.status(404).json({
                mensaje: 'Receta no encontrada'
            });
        }

        if (receta[0].id_usuario !== req.user.id_usuario) {
            return res.status(403).json({
                mensaje: 'No autorizado para modificar esta receta'
            });
        }

        await db.execute(
            'DELETE FROM recetas_ingredientes WHERE id_receta = ? AND id_ingrediente = ?',
            [req.params.id_receta, req.params.id_ingrediente]
        );
        
        res.json({ mensaje: 'Ingrediente eliminado de la receta exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Servir archivos estáticos desde la carpeta Frontend
app.use(express.static(path.join(__dirname, '../Frontend')));

// Manejar todas las rutas frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Error interno del servidor' 
            : err.message
    });
});

// Obtener recetas de un usuario específico
app.get('/api/usuarios/:id/recetas', verifyToken, async (req, res) => {
    try {
        const [recetas] = await db.execute(`
            SELECT r.*, c.nombre as categoria_nombre
            FROM recetas r 
            LEFT JOIN categorias c ON r.id_categoria = c.id_categoria
            WHERE r.id_usuario = ?
        `, [req.params.id]);

        res.json(recetas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener información detallada del usuario
app.get('/api/usuarios/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.id_usuario !== parseInt(req.params.id)) {
            return res.status(403).json({
                mensaje: 'No autorizado para ver este perfil'
            });
        }

        const [usuario] = await db.execute(
            'SELECT id_usuario, nombre, email, fecha_registro FROM usuarios WHERE id_usuario = ?',
            [req.params.id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json(usuario[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener estadísticas de recetas del usuario
app.get('/api/usuarios/:id/recetas/stats', verifyToken, async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total,
                (SELECT nombre 
                 FROM recetas 
                 WHERE id_usuario = ? 
                 ORDER BY fecha_creacion DESC 
                 LIMIT 1) as latest,
                (SELECT r.nombre 
                 FROM recetas r 
                 LEFT JOIN valoraciones v ON r.id_receta = v.id_receta 
                 WHERE r.id_usuario = ? 
                 GROUP BY r.id_receta 
                 ORDER BY AVG(v.puntuacion) DESC 
                 LIMIT 1) as bestRated
            FROM recetas 
            WHERE id_usuario = ?
        `, [req.params.id, req.params.id, req.params.id]);

        res.json(stats[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});