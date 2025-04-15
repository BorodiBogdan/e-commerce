import { Product } from "../types";

export const API_BASE_URL = "http://localhost:3001";

interface ProductQueryParams {
  category?: string;
  min_price?: number;
  max_price?: number;
  search_term?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export const api = {
  async getProducts(params?: ProductQueryParams): Promise<Product[]> {
    const queryString = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryString.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/products?${queryString}`);
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }
    return response.json();
  },

  async getProduct(id: number): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product");
    }
    return response.json();
  },

  async createProduct(product: Omit<Product, "id">): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        category: product.category,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create product");
    }
    return response.json();
  },

  async updateProduct(id: number, product: Product): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update product");
    }
    return response.json();
  },

  async deleteProduct(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete product");
    }
  },
};
