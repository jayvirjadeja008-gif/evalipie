export interface User { id: number; email: string; name: string; role: "customer" | "admin" }

export interface Product {
  id: number;
  sku: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  category_name: string;
  price: number;
  mrp?: number;
  discount_percent?: number;
  rating?: number;
  review_count?: number;
  image_url: string;
  stock: Record<string, number>;
}

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  mrp?: number;
  discount_percent?: number;
  image_url: string;
  available: number;
  inStock: boolean;
}

export interface Cart {
  city: string;
  items: CartItem[];
  totalPaise: number;
  canCheckout: boolean;
}

export interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  unitPaise: number;
  price?: number;
}

export interface Order {
  id: number;
  city: string;
  status: string;
  total_paise: number;
  payment_method?: string;
  payment_status?: string;
  payment_ref?: string;
  created_at: string;
  items: OrderItem[];
  confirmation?: { message: string } | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  products: number;
}

export interface Facets {
  categories: { slug: string; count: number }[];
  cities: { city: string; count: number }[];
  price: { min: number | null; max: number | null };
}

export interface Review {
  id: number;
  product_id: number;
  user_name: string;
  city: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewsResponse {
  productId: number;
  total: number;
  average: number;
  breakdown: Record<number, number>;
  reviews: Review[];
}
