CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    imagen VARCHAR(225),
    color VARCHAR(10) NOT NULL DEFAULT '000000'
);

CREATE TABLE pictograma (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    imagen_url VARCHAR(225),
    categoria_id INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    icono VARCHAR,
    usos INTEGER NOT NULL DEFAULT 0
);