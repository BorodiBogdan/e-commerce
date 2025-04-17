"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Product, ProductFilters, ValidationError } from "../types";
import ProductService from "../services/productService";
import ProductCard from "./components/ProductCard";
import ProductForm from "./components/ProductForm";
import ProductCharts from "./components/ProductCharts";
import StatusIndicator from "../components/StatusIndicator";
import { FileManager } from "../components/FileManager";
import Toast from "./components/Toast";
import { ProductFiltersComponent } from "./components/ProductFilters";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const loadingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showToast, setShowToast] = useState(false);

  const productService = ProductService.getInstance();

  const loadAllProducts = useCallback(async () => {
    try {
      const { products: allProducts } = await productService.getProducts(
        {},
        0,
        1000
      );
      setAllProducts(allProducts);
    } catch (err) {
      console.error("Failed to load all products for charts:", err);
    }
  }, []);

  const loadProducts = useCallback(
    async (currentPage: number, reset: boolean = false) => {
      if (loadingRef.current) return;

      try {
        loadingRef.current = true;
        setLoading(true);
        const { products: newProducts, hasMore: newHasMore } =
          await productService.getProducts(filters, currentPage, 6);

        setProducts((prev) =>
          reset ? newProducts : [...prev, ...newProducts]
        );
        setHasMore(newHasMore);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load products"
        );
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [filters]
  );

  // Initial load
  useEffect(() => {
    loadProducts(0, true);
    loadAllProducts();
  }, [loadProducts, loadAllProducts]);

  // Setup scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (
        container.scrollHeight - container.scrollTop <=
          container.clientHeight + 100 &&
        hasMore &&
        !loading
      ) {
        setPage((prev) => prev + 1);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading]);

  // Load more products when page changes
  useEffect(() => {
    if (page > 0) {
      loadProducts(page);
    }
  }, [page, loadProducts]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    loadProducts(0, true);
  }, [filters, loadProducts]);

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

  const showNotification = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const handleCreateProduct = useCallback(
    async (product: Omit<Product, "id">) => {
      try {
        setError(null);
        const newProduct = await productService.createProduct(product);
        setProducts((prev) => [newProduct, ...prev]);
        setShowForm(false);
        showNotification("Product created successfully");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create product"
        );
      }
    },
    [showNotification]
  );

  const handleUpdateProduct = useCallback(
    async (product: Omit<Product, "id"> & { id?: number }) => {
      try {
        setError(null);
        if (!editingProduct?.id) {
          throw new Error("Product ID is required for update");
        }
        const updatedProduct = await productService.updateProduct({
          ...product,
          id: editingProduct.id,
        });
        setProducts((prev) =>
          prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
        );
        setShowForm(false);
        setEditingProduct(null);
        showNotification("Product updated successfully");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update product"
        );
      }
    },
    [editingProduct, showNotification]
  );

  const handleDeleteProduct = useCallback(
    async (id: number) => {
      try {
        setError(null);
        await productService.deleteProduct(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showNotification("Product deleted successfully");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete product"
        );
      }
    },
    [showNotification]
  );

  // Extract unique categories from all products
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    allProducts.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [allProducts]);

  const handleFiltersChange = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset pagination when filters change
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <StatusIndicator />
      <Toast message={toastMessage} isVisible={showToast} />
      <h1 className="text-3xl font-bold mb-8">Product Management</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add New Product
        </button>
      </div>

      <ProductFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
      />

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
              editingProduct ? handleUpdateProduct : handleCreateProduct
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

      {loading && products.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading products...</div>
        </div>
      ) : (
        <>
          <ProductCharts products={allProducts} />

          <div className="mt-8">
            <div ref={containerRef} className="h-[600px] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id}>
                    <ProductCard
                      product={product}
                      onDelete={handleDeleteProduct}
                      onEdit={() => {
                        setEditingProduct(product);
                        setShowForm(true);
                      }}
                    />
                  </div>
                ))}
              </div>

              {loading && products.length > 0 && (
                <div className="flex justify-center items-center h-20">
                  <div className="text-gray-600">Loading more products...</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="container mx-auto px-4 py-8">
        <FileManager />
      </div>
    </div>
  );
}
