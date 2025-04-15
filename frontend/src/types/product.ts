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
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
