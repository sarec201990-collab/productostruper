-- ==============================================================================
-- POSTGRESQL · ESQUEMA CANÓNICO DEL CATÁLOGO TRUPER (FLEXIVOR)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS truper_products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    clave VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    brand VARCHAR(80) NOT NULL DEFAULT 'Truper',
    family VARCHAR(120) NOT NULL DEFAULT 'General',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(12, 2) DEFAULT 0.00,
    image_url TEXT NOT NULL,
    unit VARCHAR(30) DEFAULT 'Pieza',
    ean VARCHAR(60),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices B-Tree y Trigram para búsqueda instantánea
CREATE INDEX IF NOT EXISTS idx_truper_code ON truper_products(code);
CREATE INDEX IF NOT EXISTS idx_truper_clave ON truper_products(clave);
CREATE INDEX IF NOT EXISTS idx_truper_brand ON truper_products(brand);
CREATE INDEX IF NOT EXISTS idx_truper_family ON truper_products(family);
CREATE INDEX IF NOT EXISTS idx_truper_desc_trgm ON truper_products USING gin(description gin_trgm_ops);
