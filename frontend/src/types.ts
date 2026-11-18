export interface Product {
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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BrandInfo {
  name: string;
  count: number;
}
