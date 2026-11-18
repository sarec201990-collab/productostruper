import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import { searchProducts, getProductByCode, getBrands, getFamilies } from './db.js';
import { securityHeaders, rateLimiter } from './security.js';
import { sendDirectMessageToChatSystem } from './chat_bridge.js';

const app = express();
const PORT = Number(process.env.PORT) || 5051;
const ALT_PORT = 5088;
const DOMAIN = process.env.DOMAIN || 'catalogo.flexivor.com.mx';
const IMAGES_CACHE_DIR = path.resolve(import.meta.dirname, '../../data/images_cache');

if (!fs.existsSync(IMAGES_CACHE_DIR)) {
  fs.mkdirSync(IMAGES_CACHE_DIR, { recursive: true });
}

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" fill="#f8fafc" rx="16"/>
  <path d="M50 140l30-35 25 30 25-45 40 50H50z" fill="#cbd5e1"/>
  <circle cx="75" cy="70" r="14" fill="#cbd5e1"/>
  <text x="100" y="170" font-family="system-ui, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle" font-weight="bold">Foto Oficial Truper</text>
</svg>`;

// Apply security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Apply rate limiting (60 requests per minute per IP for API)
const apiLimiter = rateLimiter({ maxRequests: 60, windowMs: 60000 });

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Truper Catalog API'
  });
});

// Dynamic OpenGraph handler for WhatsApp and Social Media Sharing
app.get('/p/:code', (req: Request, res: Response) => {
  const rawCode = req.params.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
  const product = getProductByCode(code);

  if (!product) {
    res.status(404).send('Producto no encontrado');
    return;
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isSocialCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot/i.test(userAgent);

  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(product.price);

  const title = `${product.description} | Truper`;
  const description = `🔧 Clave: ${product.clave} | Marca: ${product.brand} | 💰 Precio público: ${formattedPrice} MXN`;
  const productUrl = `https://${DOMAIN}/#product-${product.code}`;

  if (isSocialCrawler) {
    // Return lightweight HTML with OpenGraph tags specifically for WhatsApp / Social previews
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(product.image_url)}">
  <meta property="og:url" content="${escapeHtml(productUrl)}">
  <meta property="og:site_name" content="Catálogo Digital Truper · Flexivor">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(product.image_url)}">
</head>
<body>
  <h1>${escapeHtml(product.description)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.description)}">
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  // If a human clicks the link, redirect to frontend product view
  res.redirect(`/#product-${product.code}`);
});

// Catalog products API
app.get('/api/v1/products', apiLimiter, (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const brand = req.query.brand as string | undefined;
    const family = req.query.family as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '24', 10);

    const result = searchProducts({ search, brand, family, page, limit });
    
    // Map product image URLs to use our high-speed local caching proxy
    result.products = result.products.map(p => {
      const cleanClave = p.clave.replace(/\//g, '-').replace(/\s+/g, '');
      return {
        ...p,
        image_url: `/api/v1/image/${cleanClave}.jpg`
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error al consultar productos del catálogo' });
  }
});

// High-Speed Image Proxy & Disk Cache for Truper CDN
app.get('/api/v1/image/:clave', (req: Request, res: Response) => {
  const rawClave = req.params.clave;
  const rawStr = Array.isArray(rawClave) ? rawClave[0] : rawClave;
  const clave = rawStr.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  const cleanClave = clave.endsWith('.jpg') ? clave : `${clave}.jpg`;
  const localFilePath = path.join(IMAGES_CACHE_DIR, cleanClave);

  // Aggressive caching: cache for 1 year in browser and Cloudflare edge CDN
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  // 1. Serve immediately from local SSD cache (< 2ms)
  if (fs.existsSync(localFilePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(localFilePath);
    return;
  }

  // 2. Stream from Truper CDN and save to disk cache in background
  const truperUrl = `https://www.truper.com/media/import/imagenes/${cleanClave}`;
  
  https.get(truperUrl, (truperRes) => {
    if (truperRes.statusCode === 200) {
      res.setHeader('Content-Type', 'image/jpeg');
      const fileStream = fs.createWriteStream(localFilePath);
      truperRes.pipe(fileStream);
      truperRes.pipe(res);
    } else {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(FALLBACK_SVG);
    }
  }).on('error', (err) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(FALLBACK_SVG);
  });
});

// Direct message endpoint to Flexivor Chat System
app.post('/api/v1/chat/direct-message', apiLimiter, (req: Request, res: Response) => {
  try {
    const { clientId, name, deviceInfo, phone, message, cartSummary, productCode, productClave, productName } = req.body || {};
    const result = sendDirectMessageToChatSystem({
      clientId,
      name,
      deviceInfo,
      phone,
      message,
      cartSummary,
      productCode,
      productClave,
      productName
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Error handling direct message:', error);
    res.status(500).json({ error: 'Error al enviar mensaje a atención directa' });
  }
});

// Single product by code
app.get('/api/v1/products/:code', apiLimiter, (req: Request, res: Response) => {
  try {
    const rawCode = req.params.code;
    const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
    const product = getProductByCode(code);
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    const cleanClave = product.clave.replace(/\//g, '-').replace(/\s+/g, '');
    res.json({
      ...product,
      image_url: `/api/v1/image/${cleanClave}.jpg`
    });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Error al consultar producto' });
  }
});

// Brand list
app.get('/api/v1/brands', apiLimiter, (req: Request, res: Response) => {
  try {
    const brands = getBrands();
    res.json(brands);
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Family categories list
app.get('/api/v1/families', apiLimiter, (req: Request, res: Response) => {
  try {
    const families = getFamilies();
    res.json(families);
  } catch (error: any) {
    console.error('Error fetching families:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Serve frontend static files if built
const frontendDistPath = path.resolve(import.meta.dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVIDOR CATÁLOGO TRUPER ACTIVO`);
  console.log(`📡 Puerto Principal: http://localhost:${PORT}`);
  console.log(`🌐 Dominio público: https://${DOMAIN}`);
  console.log(`=======================================================`);

  // Also listen on ALT_PORT if available
  try {
    if (ALT_PORT !== PORT) {
      app.listen(ALT_PORT, () => {
        console.log(`📡 Puerto Secundario: http://localhost:${ALT_PORT}`);
      }).on('error', () => {});
    }
  } catch {}

  // Pre-warm top 24 popular products images into local disk cache
  setTimeout(() => {
    try {
      const initial = searchProducts({ page: 1, limit: 24 });
      for (const p of initial.products) {
        const cleanClave = p.clave.replace(/\//g, '-').replace(/\s+/g, '') + '.jpg';
        const localPath = path.join(IMAGES_CACHE_DIR, cleanClave);
        if (!fs.existsSync(localPath)) {
          https.get(`https://www.truper.com/media/import/imagenes/${cleanClave}`, (res) => {
            if (res.statusCode === 200) {
              res.pipe(fs.createWriteStream(localPath));
            }
          }).on('error', () => {});
        }
      }
    } catch {}
  }, 1000);
});
