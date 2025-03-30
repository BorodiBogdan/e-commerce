"use client";

import { useState, useEffect, useMemo } from "react";
import ProductCard from "./components/ProductCard";
import ProductForm from "./components/ProductForm";
import ProductCharts from "./components/ProductCharts";
import Toast from "./components/Toast";
import {
  Product,
  productService,
  ProductFilters,
  ValidationError,
} from "../services/productService";
import { api } from "../services/api";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const queryParams = {
        category: filters.category,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        search_term: filters.searchTerm,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const fetchedProducts = await api.getProducts(queryParams);
      setProducts(fetchedProducts);
      setCategories(
        Array.from(new Set(fetchedProducts.map((p) => p.category)))
      );
      setCurrentPage(1);
    } catch (error) {
      setToastMessage("Failed to load products");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefresh) {
      setToastMessage("Auto-refreshing prices...");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);

      intervalId = setInterval(async () => {
        try {
          setIsLoading(true);
          const fetchedProducts = await api.getProducts();

          // Compare prices and highlight changes
          setProducts((prevProducts) => {
            return fetchedProducts.map((newProduct) => {
              const prevProduct = prevProducts.find(
                (p) => p.id === newProduct.id
              );
              if (prevProduct && prevProduct.price !== newProduct.price) {
                // Show price change toast
                const priceDiff = newProduct.price - prevProduct.price;
                const changePercent = (
                  (priceDiff / prevProduct.price) *
                  100
                ).toFixed(1);
                setToastMessage(
                  `${newProduct.name}: ${
                    priceDiff > 0 ? "+" : ""
                  }${changePercent}%`
                );
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
              }
              return newProduct;
            });
          });

          setCategories(
            Array.from(new Set(fetchedProducts.map((p) => p.category)))
          );
        } catch (error) {
          setToastMessage("Failed to refresh products");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        } finally {
          setIsLoading(false);
        }
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  useEffect(() => {
    loadProducts();
  }, [filters, sortBy, sortOrder]);

  const statistics = useMemo(() => {
    if (products.length === 0) return null;

    const prices = products.map((p) => p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return {
      maxPrice,
      minPrice,
      avgPrice,
      maxPriceProduct: products.find((p) => p.price === maxPrice)?.id,
      minPriceProduct: products.find((p) => p.price === minPrice)?.id,
      avgPriceProduct: products.reduce((closest, product) => {
        return Math.abs(product.price - avgPrice) <
          Math.abs(closest.price - avgPrice)
          ? product
          : closest;
      }, products[0]).id,
    };
  }, [products]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return products.slice(startIndex, startIndex + itemsPerPage);
  }, [products, currentPage, itemsPerPage]);

  const totalPages = useMemo(
    () => Math.ceil(products.length / itemsPerPage),
    [products, itemsPerPage]
  );

  const handleAddProduct = async (product: Omit<Product, "id">) => {
    try {
      const newProduct = await api.createProduct(product);
      setProducts((prev) => [...prev, newProduct]);
      setCategories((prev) => Array.from(new Set([...prev, product.category])));
      setToastMessage("Product added successfully");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setShowForm(false);
    } catch (error) {
      setToastMessage("Failed to add product");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleUpdateProduct = async (product: Omit<Product, "id">) => {
    if (!editingProduct) return;

    try {
      const updatedProduct = await api.updateProduct(editingProduct.id, {
        ...product,
        id: editingProduct.id,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
      );
      setCategories((prev) => Array.from(new Set([...prev, product.category])));
      setToastMessage("Product updated successfully");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setEditingProduct(null);
      setShowForm(false);
    } catch (error) {
      setToastMessage("Failed to update product");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setToastMessage("Product deleted successfully");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      setToastMessage("Failed to delete product");
      setShowToast(true);
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
            <div className="flex gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-md ${
                  autoRefresh
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {autoRefresh ? "Stop Auto-Refresh" : "Start Auto-Refresh"}
              </button>
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
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="fixed top-0 left-0 w-full h-1 bg-blue-200">
              <div
                className="h-full bg-blue-600 animate-pulse"
                style={{ width: "100%" }}
              ></div>
            </div>
          )}

          {/* Add Charts component */}
          <ProductCharts products={products} />

          {/* Statistics Summary */}
          {statistics && (
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
              <h2 className="text-lg font-semibold mb-2">Product Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border p-3 rounded bg-green-50">
                  <p className="text-sm font-medium">Most Expensive</p>
                  <p className="text-xl font-bold text-green-700">
                    ${statistics.maxPrice.toFixed(2)}
                  </p>
                </div>
                <div className="border p-3 rounded bg-blue-50">
                  <p className="text-sm font-medium">Average Price</p>
                  <p className="text-xl font-bold text-blue-700">
                    ${statistics.avgPrice.toFixed(2)}
                  </p>
                </div>
                <div className="border p-3 rounded bg-red-50">
                  <p className="text-sm font-medium">Least Expensive</p>
                  <p className="text-xl font-bold text-red-700">
                    ${statistics.minPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Products are highlighted in the list according to these
                statistics
              </p>
            </div>
          )}

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
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onDelete={handleDeleteProduct}
                onEdit={handleEditProduct}
                isHighestPrice={statistics?.maxPriceProduct === product.id}
                isLowestPrice={statistics?.minPriceProduct === product.id}
                isAveragePrice={statistics?.avgPriceProduct === product.id}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md mr-2 bg-white border disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "bg-white"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md ml-2 bg-white border disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}

          <Toast message={toastMessage} isVisible={showToast} />
        </div>
      </div>
    </div>
  );
}
