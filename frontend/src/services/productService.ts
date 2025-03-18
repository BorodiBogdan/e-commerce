export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Initial mock data
const mockProducts: Product[] = [
  {
    id: 1,
    name: "Nike Air Max",
    price: 199.99,
    image: "/assets/images/nike.jpg",
    description: "Classic Nike Air Max sneakers",
    category: "Shoes",
  },
  {
    id: 2,
    name: "Adidas Ultra Boost",
    price: 179.99,
    image: "/assets/images/adidas-ultraboost.jpg",
    description: "Comfortable running shoes",
    category: "Shoes",
  },
  {
    id: 3,
    name: "T-Shirt",
    price: 19.99,
    image: "/assets/images/tshirt.jpeg",
    description: "Comfortable running shoes",
    category: "Clothes",
  },
];

class ProductService {
  private products: Product[] = [...mockProducts];

  // Validation function
  private validateProduct(product: Omit<Product, "id">): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!product.name || product.name.trim().length < 3) {
      errors.push({
        field: "name",
        message: "Name must be at least 3 characters long",
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

  // Get all products with optional filtering and sorting
  getProducts(
    filters?: ProductFilters,
    sortBy?: keyof Product,
    sortOrder: "asc" | "desc" = "asc"
  ): Product[] {
    let filteredProducts = [...this.products];

    // Apply filters
    if (filters) {
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
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Apply sorting
    if (sortBy) {
      filteredProducts.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (sortOrder === "asc") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        }
      });
    }

    return filteredProducts;
  }

  // Get unique categories
  getCategories(): string[] {
    return Array.from(new Set(this.products.map((p) => p.category)));
  }

  // Add a new product
  addProduct(product: Omit<Product, "id">): {
    product?: Product;
    errors?: ValidationError[];
  } {
    const validationErrors = this.validateProduct(product);
    if (validationErrors.length > 0) {
      return { errors: validationErrors };
    }

    const newProduct = {
      ...product,
      id: Math.max(...this.products.map((p) => p.id), 0) + 1,
    };

    this.products.push(newProduct);
    return { product: newProduct };
  }

  // Update an existing product
  updateProduct(
    id: number,
    product: Omit<Product, "id">
  ): { product?: Product; errors?: ValidationError[] } {
    const validationErrors = this.validateProduct(product);
    if (validationErrors.length > 0) {
      return { errors: validationErrors };
    }

    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return { errors: [{ field: "id", message: "Product not found" }] };
    }

    const updatedProduct = { ...product, id };
    this.products[index] = updatedProduct;
    return { product: updatedProduct };
  }

  // Delete a product
  deleteProduct(id: number): boolean {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    this.products.splice(index, 1);
    return true;
  }
}

export const productService = new ProductService();
