import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { searchProducts, getProductByCode, getBrands, getFamilies } from './db.js';
import { securityHeaders, rateLimiter } from './security.js';

const app = express();
const PORT = process.env.PORT || 5051;
const DOMAIN = process.env.DOMAIN || 'catalogo.flexivor.com.mx';

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
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error al consultar productos del catálogo' });
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
    res.json(product);
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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SERVIDOR CATÁLOGO TRUPER ACTIVO`);
  console.log(`📡 Puerto: http://localhost:${PORT}`);
  console.log(`🌐 Dominio público: https://${DOMAIN}`);
  console.log(`=======================================================`);
});
