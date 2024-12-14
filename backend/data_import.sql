USE recetas;

-- Insertar algunas categorías básicas
INSERT INTO categorias (nombre, descripcion) VALUES
('Platos Principales', 'Platos principales y segundos'),
('Ensaladas', 'Ensaladas y platos frescos'),
('Sopas', 'Sopas y cremas'),
('Postres', 'Postres y dulces'),
('Internacional', 'Platos de diferentes países');

-- Insertar un usuario de prueba
INSERT INTO usuarios (nombre, email, password) VALUES
('Admin', 'admin@cocina.com', 'admin123');

-- Insertar las recetas
INSERT INTO recetas (id_usuario, id_categoria, nombre, descripcion, tiempo_preparacion, dificultad) VALUES
(1, 2, 'Ensalada César', 'Una deliciosa ensalada con lechuga, crutones y aderezo César.', 20, 'Fácil'),
(1, 3, 'Sopa de Tomate', 'Sopa caliente con un toque de albahaca fresca.', 30, 'Fácil'),
(1, 1, 'Pasta Carbonara', 'Un plato clásico italiano con tocino y queso parmesano.', 25, 'Intermedia'),
(1, 1, 'Pizza Margarita', 'Pizza con tomate fresco, albahaca y queso mozzarella.', 45, 'Intermedia'),
(1, 5, 'Tacos al Pastor', 'Tacos con carne marinada, piña y cilantro.', 40, 'Intermedia'),
(1, 1, 'Hamburguesa Clásica', 'Carne jugosa con queso, lechuga y tomate.', 30, 'Fácil'),
(1, 5, 'Paella Valenciana', 'Un plato tradicional español con mariscos y verduras.', 60, 'Difícil'),
(1, 5, 'Sushi de Salmón', 'Rollo de sushi con salmón fresco y aguacate.', 45, 'Difícil'),
(1, 4, 'Crepes Suzette', 'Deliciosos crepes con salsa de naranja y licor.', 35, 'Intermedia'),
(1, 1, 'Chili con Carne', 'Un guiso picante de carne con frijoles y especias.', 50, 'Intermedia');

-- Insertar ingredientes comunes
INSERT INTO ingredientes (nombre) VALUES
('Lechuga'),
('Crutones'),
('Queso parmesano'),
('Tomate'),
('Albahaca'),
('Pasta'),
('Tocino'),
('Mozzarella'),
('Carne molida'),
('Cebolla'),
('Ajo'),
('Pimientos'),
('Arroz'),
('Salmón'),
('Aguacate'),
('Limón'),
('Pan'),
('Huevos'),
('Leche'),
('Mantequilla');

-- Insertar relaciones recetas-ingredientes (ejemplo para algunas recetas)
INSERT INTO recetas_ingredientes (id_receta, id_ingrediente, cantidad) VALUES
(1, 1, '1 lechuga grande'),
(1, 2, '100g'),
(1, 3, '50g'),
(2, 4, '500g'),
(2, 5, '10 hojas'),
(3, 6, '400g'),
(3, 7, '200g'),
(3, 3, '100g'),
(4, 4, '300g'),
(4, 8, '200g'),
(4, 5, '8 hojas');

-- Insertar algunas valoraciones de ejemplo
INSERT INTO valoraciones (id_usuario, id_receta, puntuacion, comentario) VALUES
(1, 1, 5, '¡Excelente receta! Muy fácil de preparar.'),
(1, 2, 4, 'Muy sabrosa, pero necesita un poco más de condimentos.'),
(1, 3, 5, 'La mejor carbonara que he probado.'); 