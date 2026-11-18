import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = process.env.SQLITE_PATH || path.resolve(import.meta.dirname, '../../data/truper_catalog.sqlite3');

if (!fs.existsSync(DB_PATH)) {
  console.error(`[DATABASE ERROR] SQLite file not found at: ${DB_PATH}`);
}

export const db = new DatabaseSync(DB_PATH);

export interface ProductRecord {
  id: number;
  code: string;
  clave: string;
  description: string;
  brand: string;
  family: string;
  price: number;
  wholesale_price: number | null;
  image_url: string;
  unit: string | null;
  ean: string | null;
}

export interface ProductQueryResult {
  products: ProductRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function searchProducts(params: {
  search?: string;
  brand?: string;
  family?: string;
  page?: number;
  limit?: number;
}): ProductQueryResult {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 24));
  const offset = (page - 1) * limit;

  const whereConditions: string[] = [];
  const queryArgs: any[] = [];

  const search = (params.search || '').trim();
  const brand = (params.brand || '').trim();
  const family = (params.family || '').trim();

  if (search) {
    // If it looks like a numeric code or exact clave, search directly or use LIKE
    whereConditions.push('(code LIKE ? OR clave LIKE ? OR description LIKE ?)');
    const term = `%${search}%`;
    queryArgs.push(term, term, term);
  }

  if (brand && brand !== 'Todas') {
    whereConditions.push('brand = ?');
    queryArgs.push(brand);
  }

  if (family && family !== 'Todas') {
    whereConditions.push('family = ?');
    queryArgs.push(family);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countResult = countStmt.get(...queryArgs) as { total: number };
  const total = countResult ? countResult.total : 0;

  // Get products with pagination
  const dataSql = `
    SELECT id, code, clave, description, brand, family, price, wholesale_price, image_url, unit, ean
    FROM products
    ${whereClause}
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `;
  const dataStmt = db.prepare(dataSql);
  const products = dataStmt.all(...queryArgs, limit, offset) as unknown as ProductRecord[];

  return {
    products,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

export function getProductByCode(code: string): ProductRecord | null {
  const stmt = db.prepare(`
    SELECT id, code, clave, description, brand, family, price, wholesale_price, image_url, unit, ean
    FROM products
    WHERE code = ? OR clave = ?
    LIMIT 1
  `);
  const row = stmt.get(code, code) as unknown as ProductRecord;
  return row || null;
}

export function getBrands(): { name: string; count: number }[] {
  const stmt = db.prepare(`
    SELECT brand as name, COUNT(*) as count
    FROM products
    GROUP BY brand
    ORDER BY count DESC
  `);
  return stmt.all() as unknown as { name: string; count: number }[];
}

export function getFamilies(): { name: string; count: number }[] {
  const stmt = db.prepare(`
    SELECT family as name, COUNT(*) as count
    FROM products
    GROUP BY family
    ORDER BY count DESC
    LIMIT 30
  `);
  return stmt.all() as unknown as { name: string; count: number }[];
}
