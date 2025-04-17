"use client";
import React, { useEffect, useState } from "react";
import ProductCharts from "../components/ProductCharts";
import { FileManager } from "@/components/FileManager";

const AdminView: React.FC = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true); // New state for loading

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          "http://localhost:3001/api/products?limit=10000"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        setProducts(data);
        setLoading(false); // Set loading to false after data is fetched
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false); // Set loading to false even if there's an error
      }
    };

    fetchProducts();

    const intervalId = setInterval(() => {
      fetchProducts();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-blue-600">Loading...</h1>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 className="text-3xl font-bold text-blue-600">Admin Dashboard</h1>
      <div className="container mx-auto px-4 py-8">
        <ProductCharts products={products} />
        <FileManager />
      </div>
    </div>
  );
};

export default AdminView;
