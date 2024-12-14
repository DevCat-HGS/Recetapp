CREATE DATABASE recetas;
USE recetas;

-- Crear tabla usuarios
CREATE TABLE `usuarios` (
  `id_usuario` INT PRIMARY KEY AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla categorias
CREATE TABLE `categorias` (
  `id_categoria` INT PRIMARY KEY AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT
);

-- Crear tabla recetas
CREATE TABLE `recetas` (
  `id_receta` INT PRIMARY KEY AUTO_INCREMENT,
  `id_usuario` INT,
  `id_categoria` INT,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT,
  `tiempo_preparacion` INT,
  `dificultad` ENUM('Fácil', 'Intermedia', 'Difícil') DEFAULT 'Fácil',
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`) ON DELETE SET NULL
);

-- Crear tabla ingredientes
CREATE TABLE `ingredientes` (
  `id_ingrediente` INT PRIMARY KEY AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL
);

-- Crear tabla recetas_ingredientes
CREATE TABLE `recetas_ingredientes` (
  `id_receta` INT,
  `id_ingrediente` INT,
  `cantidad` VARCHAR(100),
  PRIMARY KEY (`id_receta`, `id_ingrediente`),
  FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id_receta`) ON DELETE CASCADE,
  FOREIGN KEY (`id_ingrediente`) REFERENCES `ingredientes` (`id_ingrediente`) ON DELETE CASCADE
);

-- Crear tabla valoraciones
CREATE TABLE `valoraciones` (
  `id_valoracion` INT PRIMARY KEY AUTO_INCREMENT,
  `id_usuario` INT,
  `id_receta` INT,
  `puntuacion` INT CHECK (`puntuacion` BETWEEN 1 AND 5),
  `comentario` TEXT,
  `fecha_valoracion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id_receta`) ON DELETE CASCADE
);

-- Crear tabla pasos
CREATE TABLE `pasos` (
  `id_paso` INT PRIMARY KEY AUTO_INCREMENT,
  `id_receta` INT,
  `numero_paso` INT,
  `descripcion` TEXT,
  FOREIGN KEY (`id_receta`) REFERENCES `recetas` (`id_receta`) ON DELETE CASCADE
);