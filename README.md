# Catálogo Digital Truper · Ecosistema Flexivor

Catálogo digital interactivo y de alto rendimiento para productos de la marca **Truper** (y submarcas asociadas: Pretul, Volteck, Foset, Fiero, Hermex, Expert, Klintek). Diseñado con arquitectura estructurada, mobile-first y optimizado para compartir productos y cotizaciones directamente por **WhatsApp**.

---

## 🚀 Características Principales

- **16,043 Productos Reales Truper:** Base de datos completa con claves oficiales, códigos numéricos, descripciones y precios públicos vigentes con IVA.
- **Imágenes Oficiales en Alta Definición:** Integración dinámica con el repositorio multimedia de Truper (`https://www.truper.com/media/import/imagenes/{CLAVE}.jpg`) con fallback SVG local.
- **Compartir por WhatsApp en 1 Clic:**
  - **Consulta individual:** Botón en cada tarjeta con formato enriquecido (nombre, clave, marca, precio y enlace con vista previa OpenGraph).
  - **Cotizador / Pedido rápido:** Carrito interactivo que calcula el total de piezas y el importe en `$ MXN`, permitiendo enviar la cotización desglosada por WhatsApp.
- **Buscador Reactivo y Filtros:** Búsqueda instantánea con debouncing y filtrado por marcas (Truper, Pretul, Volteck, Foset, Fiero, etc.) y ordenamiento por precio.
- **Diseño Mobile-First:** Experiencia táctil optimizada para teléfonos inteligentes y adaptable a pantallas de escritorio.
- **Seguridad y Rendimiento:**
  - Consultas SQL parametrizadas contra inyecciones SQL.
  - Rate limiting en memoria con detección de IP Real de Cloudflare (`cf-connecting-ip`).
  - Cabeceras de seguridad estrictas (OWASP: HSTS, X-Content-Type-Options, X-Frame-Options).
  - Microservicio OpenGraph dinámico para previsualizaciones en redes sociales.

---

## 📁 Estructura del Proyecto

```text
productostruper/
├── backend/                   # Servidor API y Servicio OpenGraph
│   ├── src/
│   │   ├── server.ts          # API REST y servidor de assets estáticos
│   │   ├── db.ts              # Consultas parametrizadas a la base de datos
│   │   └── security.ts        # Rate limiter y cabeceras OWASP
│   └── package.json
├── frontend/                  # Aplicación React 19 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/        # ProductCard, Header, SearchBar, FilterBar, CartDrawer
│   │   ├── types.ts           # Definiciones tipadas de producto y carrito
│   │   ├── App.tsx            # Componente raíz y estado global reactivo
│   │   └── main.tsx
│   └── vite.config.ts
├── data/                      # Base de datos y esquemas
│   ├── truper_catalog.sqlite3 # Base de datos optimizada con 16,043 productos
│   ├── schema_postgres.sql    # Esquema DDL para PostgreSQL
│   └── truper_sample.json     # Muestra estructurada de productos
├── tunnel/
│   └── cloudflared.yml        # Configuración para túnel flexivor.com.mx
├── start.sh                   # Script de arranque en un solo paso
└── README.md
```

---

## 🛠️ Instalación y Ejecución Local

### 1. Iniciar con el script automatizado
```bash
chmod +x start.sh
./start.sh
```

El catálogo quedará activo en:
- **Local:** `http://localhost:5088`

### 2. Desarrollo (Hot Reload)
- **Backend:** `cd backend && npm run dev`
- **Frontend:** `cd frontend && npm run dev` (abre en `http://localhost:5173`)

---

## 🌐 Publicación con Cloudflare Tunnel (`flexivor.com.mx`)

Para exponer el catálogo hacia tu subdominio (ej. `catalogo.flexivor.com.mx`):
```bash
cloudflared tunnel --config tunnel/cloudflared.yml run
```
O bien:
```bash
cloudflared tunnel --url http://localhost:5088
```
