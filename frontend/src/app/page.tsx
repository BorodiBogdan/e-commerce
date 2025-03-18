"use client";

import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";
import ProductForm from "./components/ProductForm";
import Toast from "./components/Toast";
import {
  Product,
  productService,
  ProductFilters,
  ValidationError,
} from "../services/productService";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sortBy, setSortBy] = useState<keyof Product | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [toastMessage, setToastMessage] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Load products and categories
    loadProducts();
    setCategories(productService.getCategories());
  }, []);

  const loadProducts = () => {
    const filteredProducts = productService.getProducts(
      filters,
      sortBy,
      sortOrder
    );
    setProducts(filteredProducts);
  };

  useEffect(() => {
    loadProducts();
  }, [filters, sortBy, sortOrder]);

  const handleAddProduct = (product: Omit<Product, "id">) => {
    const result = productService.addProduct(product);
    if (result.errors) {
      setValidationErrors(result.errors);
      return;
    }
    loadProducts();
    setCategories(productService.getCategories());
    setShowForm(false);
    setShowToast(true);
    setToastMessage("Items successfully added!");
    setValidationErrors([]);
  };

  const handleUpdateProduct = (product: Omit<Product, "id">) => {
    if (!editingProduct) return;

    const result = productService.updateProduct(editingProduct.id, product);
    if (result.errors) {
      setValidationErrors(result.errors);
      return;
    }
    loadProducts();
    setEditingProduct(null);
    setShowForm(false);
    setShowToast(true);
    setToastMessage("Items successfully updated!");
    setValidationErrors([]);
  };

  const handleDeleteProduct = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (product && productService.deleteProduct(id)) {
      loadProducts();
      setShowToast(true);
      setToastMessage("Items successfully deleted!");
      // Hide toast after 3 seconds
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleEditProduct = (id: number) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setEditingProduct(product);
      setShowForm(true);
      setValidationErrors([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Our Products</h1>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
                setValidationErrors([]);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add New Product
            </button>
          </div>

          {/* Filters and Sorting */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.category || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      category: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Min Price
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.minPrice || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minPrice: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Price
                </label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.maxPrice || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxPrice: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={filters.searchTerm || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      searchTerm: e.target.value || undefined,
                    })
                  }
                  placeholder="Search products..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sort By
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={sortBy || ""}
                  onChange={(e) =>
                    setSortBy((e.target.value as keyof Product) || undefined)
                  }
                >
                  <option value="">None</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sort Order
                </label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "asc" | "desc")
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 rounded-md">
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors:
                  </h3>
                  <ul className="mt-2 text-sm text-red-700">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <ProductForm
                onSubmit={
                  editingProduct ? handleUpdateProduct : handleAddProduct
                }
                initialData={editingProduct || undefined}
                onCancel={() => {
                  setShowForm(false);
                  setEditingProduct(null);
                  setValidationErrors([]);
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onDelete={handleDeleteProduct}
                onEdit={handleEditProduct}
              />
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No products found matching your criteria.
              </p>
            </div>
          )}

          <Toast message={toastMessage} isVisible={showToast} />
        </div>
      </div>
    </div>
  );
}
