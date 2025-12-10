CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    imagen VARCHAR(255),
    color VARCHAR(10) NOT NULL DEFAULT '000000'
);

CREATE TABLE pictograma (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    imagen_url VARCHAR(255),
    categoria_id INTEGER NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    icono VARCHAR(255),
    usos INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_pictograma_categoria FOREIGN KEY (categoria_id) 
        REFERENCES categoria(id) ON DELETE RESTRICT
);

CREATE TABLE auxiliar (
    id SERIAL PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL UNIQUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE grupo (
  id SERIAL PRIMARY KEY,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  codigo_vinculacion VARCHAR(16) NOT NULL UNIQUE,
  creador_id UUID NOT NULL REFERENCES auxiliar(user_id) ON DELETE RESTRICT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nombre_paciente VARCHAR(100) NOT NULL
);

CREATE TABLE auxiliar_grupo (
    id SERIAL PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    auxiliar_id INTEGER NOT NULL REFERENCES auxiliar(id) ON DELETE CASCADE,
    grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
    es_administrador BOOLEAN NOT NULL DEFAULT FALSE,
    es_creador BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_vinculacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_auxiliar_grupo UNIQUE (auxiliar_id, grupo_id)
);

CREATE TABLE notificacion (
    id SERIAL PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    grupo_id INTEGER NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
    pictograma_id INTEGER NOT NULL REFERENCES pictograma(id) ON DELETE RESTRICT,
    contenido VARCHAR(255) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(50) NOT NULL DEFAULT 'PICTOGRAMA',
    CONSTRAINT chk_notificacion_estado CHECK (estado IN ('PENDIENTE', 'RESUELTA', 'BORRADA')),
    CONSTRAINT chk_notificacion_tipo CHECK (tipo IN ('PICTOGRAMA', 'AYUDA'))
);

CREATE TABLE token_notificacion (
    id SERIAL PRIMARY KEY,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    notificacion_id INTEGER NOT NULL REFERENCES notificacion(id) ON DELETE CASCADE,
    valor VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auxiliar_user_id ON auxiliar(user_id);
CREATE INDEX IF NOT EXISTS idx_grupo_codigo ON grupo(codigo_vinculacion);
CREATE INDEX IF NOT EXISTS idx_grupo_creador ON grupo(creador_id);
CREATE INDEX IF NOT EXISTS idx_pictograma_categoria ON pictograma(categoria_id);
CREATE INDEX IF NOT EXISTS idx_notificacion_grupo_fecha ON notificacion(grupo_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_notificacion_estado ON notificacion(estado);