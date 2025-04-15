import { Product, ProductFilters, ValidationError } from "../types";
import OfflineService from "./offlineService";

const API_BASE_URL = "http://localhost:3001/api";
const ITEMS_PER_PAGE = 6;

class ProductService {
  private static instance: ProductService;
  private offlineService: OfflineService;

  private constructor() {
    this.offlineService = OfflineService.getInstance();
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  private validateProduct(product: Omit<Product, "id">): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!product.name || product.name.trim().length < 10) {
      errors.push({
        field: "name",
        message: "Name must be at least 10 characters long",
      });
    }

    if (!product.price || product.price <= 0) {
      errors.push({
        field: "price",
        message: "Price must be greater than 0",
      });
    }

    if (!product.description || product.description.trim().length < 10) {
      errors.push({
        field: "description",
        message: "Description must be at least 10 characters long",
      });
    }

    if (!product.category) {
      errors.push({
        field: "category",
        message: "Category is required",
      });
    }

    return errors;
  }

  public async getProducts(
    filters: ProductFilters = {},
    page: number = 0,
    limit: number = 6
  ): Promise<{ products: Product[]; hasMore: boolean }> {
    const status = this.offlineService.getStatus();

    if (status.isOffline) {
      try {
        const cached = localStorage.getItem("products");
        const allProducts = cached ? JSON.parse(cached) : [];

        // Apply filters locally
        let filteredProducts = [...allProducts];
        if (filters.category) {
          filteredProducts = filteredProducts.filter(
            (p) => p.category === filters.category
          );
        }
        if (filters.minPrice !== undefined) {
          filteredProducts = filteredProducts.filter(
            (p) => p.price >= filters.minPrice!
          );
        }
        if (filters.maxPrice !== undefined) {
          filteredProducts = filteredProducts.filter(
            (p) => p.price <= filters.maxPrice!
          );
        }
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          filteredProducts = filteredProducts.filter(
            (p) =>
              p.name.toLowerCase().includes(searchLower) ||
              p.description.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        if (filters.sortBy) {
          filteredProducts.sort((a, b) => {
            const order = filters.sortOrder === "desc" ? -1 : 1;
            if (filters.sortBy === "price") {
              return (a.price - b.price) * order;
            }
            if (filters.sortBy === "name") {
              return a.name.localeCompare(b.name) * order;
            }
            return 0;
          });
        }

        // Apply pagination
        const offset = page * limit;
        const paginatedProducts = filteredProducts.slice(
          offset,
          offset + limit
        );
        const hasMore = offset + limit < filteredProducts.length;

        return { products: paginatedProducts, hasMore };
      } catch (error) {
        console.error("Error in offline getProducts:", error);
        throw error;
      }
    }

    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          queryParams.append(key, value.toString());
        }
      });
      queryParams.append("offset", (page * limit).toString());
      queryParams.append("limit", limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/products?${queryParams.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch products:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(
          `Failed to fetch products: ${response.status} ${response.statusText}`
        );
      }

      const products = await response.json();
      const hasMore = products.length === limit;

      return { products, hasMore };
    } catch (error) {
      console.error("Error in online getProducts:", error);
      throw error;
    }
  }

  private filterProducts(
    products: Product[],
    filters?: ProductFilters
  ): Product[] {
    let filtered = [...products];

    if (filters) {
      if (filters.category) {
        filtered = filtered.filter((p) => p.category === filters.category);
      }
      if (filters.minPrice) {
        filtered = filtered.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice) {
        filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term)
        );
      }
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          const order = filters.sortOrder === "desc" ? -1 : 1;
          if (filters.sortBy === "price") {
            return (a.price - b.price) * order;
          }
          if (filters.sortBy === "name") {
            return a.name.localeCompare(b.name) * order;
          }
          return 0;
        });
      }
    }

    return filtered;
  }

  public async createProduct(product: Omit<Product, "id">): Promise<Product> {
    const validationErrors = this.validateProduct(product);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.map((e) => e.message).join(", "));
    }

    const status = this.offlineService.getStatus();

    if (status.isOffline) {
      try {
        const newProduct: Product = {
          ...product,
          id: Date.now(), // Temporary ID for offline mode
        };

        // Get existing products from localStorage
        const cached = localStorage.getItem("products");
        const existingProducts = cached ? JSON.parse(cached) : [];

        // Add to pending operations
        this.offlineService.addPendingOperation({
          type: "CREATE",
          product: newProduct,
          timestamp: Date.now(),
        });

        // Update local cache with new product
        const updatedProducts = [...existingProducts, newProduct];
        localStorage.setItem("products", JSON.stringify(updatedProducts));

        return newProduct;
      } catch (error) {
        console.error("Error in offline create:", error);
        throw new Error("Failed to create product in offline mode");
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create product");
      }
      return await response.json();
    } catch (error) {
      console.error("Error in online create:", error);
      throw error;
    }
  }

  public async updateProduct(product: Product): Promise<Product> {
    if (!product || typeof product.id !== "number" || isNaN(product.id)) {
      throw new Error("Invalid product ID");
    }

    const validationErrors = this.validateProduct(product);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.map((e) => e.message).join(", "));
    }

    const status = this.offlineService.getStatus();

    if (status.isOffline) {
      try {
        // Get existing products from localStorage
        const cached = localStorage.getItem("products");
        const existingProducts = cached ? JSON.parse(cached) : [];

        // Update the product in the local cache
        const updatedProducts = existingProducts.map((p: Product) =>
          p.id === product.id ? product : p
        );
        localStorage.setItem("products", JSON.stringify(updatedProducts));

        // Add to pending operations
        this.offlineService.addPendingOperation({
          type: "UPDATE",
          product,
          timestamp: Date.now(),
        });

        return product;
      } catch (error) {
        console.error("Error in offline update:", error);
        throw new Error("Failed to update product in offline mode");
      }
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${encodeURIComponent(product.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(product),
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to update product";
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await responseClone.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error("Error in online update:", error);
      throw error;
    }
  }

  public async deleteProduct(id: number): Promise<void> {
    if (typeof id !== "number" || isNaN(id)) {
      throw new Error("Invalid product ID");
    }

    const status = this.offlineService.getStatus();

    if (status.isOffline) {
      try {
        // Get existing products from localStorage
        const cached = localStorage.getItem("products");
        const existingProducts = cached ? JSON.parse(cached) : [];

        // Find the product to be deleted
        const productToDelete = existingProducts.find(
          (p: Product) => p.id === id
        );
        if (!productToDelete) {
          console.warn(
            "Product not found in offline cache, but proceeding with deletion"
          );
          // Create a minimal product object for the pending operation
          const minimalProduct = { id } as Product;
          this.offlineService.addPendingOperation({
            type: "DELETE",
            product: minimalProduct,
            timestamp: Date.now(),
          });
        } else {
          // Remove the product from the local cache
          const updatedProducts = existingProducts.filter(
            (p: Product) => p.id !== id
          );
          localStorage.setItem("products", JSON.stringify(updatedProducts));

          // Add to pending operations
          this.offlineService.addPendingOperation({
            type: "DELETE",
            product: productToDelete,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error in offline delete:", error);
        throw error;
      }
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to delete product";
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const errorText = await responseClone.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error in online delete:", error);
      throw error;
    }
  }

  private getCachedProducts(): Product[] {
    const cached = localStorage.getItem("products");
    return cached ? JSON.parse(cached) : [];
  }
}

export default ProductService;
