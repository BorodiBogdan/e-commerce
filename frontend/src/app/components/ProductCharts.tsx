"use client";

import { useEffect, useRef } from "react";
import { Product } from "../../services/productService";

interface ChartData {
  labels: string[];
  data: number[];
}

interface ProductChartsProps {
  products: Product[];
}

export default function ProductCharts({ products }: ProductChartsProps) {
  const categoryChartRef = useRef<HTMLCanvasElement>(null);
  const priceRangeChartRef = useRef<HTMLCanvasElement>(null);
  const priceDistributionRef = useRef<HTMLCanvasElement>(null);

  // Prepare category data
  const getCategoryData = (): ChartData => {
    const categoryCount: Record<string, number> = {};
    products.forEach((product) => {
      if (categoryCount[product.category]) {
        categoryCount[product.category]++;
      } else {
        categoryCount[product.category] = 1;
      }
    });

    return {
      labels: Object.keys(categoryCount),
      data: Object.values(categoryCount),
    };
  };

  // Prepare price range data
  const getPriceRangeData = (): ChartData => {
    const ranges = ["$0-$50", "$50-$100", "$100-$150", "$150-$200", "$200+"];
    const counts = [0, 0, 0, 0, 0];

    products.forEach((product) => {
      const price = product.price;
      if (price < 50) counts[0]++;
      else if (price < 100) counts[1]++;
      else if (price < 150) counts[2]++;
      else if (price < 200) counts[3]++;
      else counts[4]++;
    });

    return {
      labels: ranges,
      data: counts,
    };
  };

  // Prepare average price by category
  const getAvgPriceByCategory = (): ChartData => {
    const categoryPrices: Record<string, number[]> = {};

    products.forEach((product) => {
      if (!categoryPrices[product.category]) {
        categoryPrices[product.category] = [];
      }
      categoryPrices[product.category].push(product.price);
    });

    const avgPrices: Record<string, number> = {};
    for (const [category, prices] of Object.entries(categoryPrices)) {
      avgPrices[category] =
        prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }

    return {
      labels: Object.keys(avgPrices),
      data: Object.values(avgPrices),
    };
  };

  // Draw bar chart
  const drawBarChart = (
    canvas: HTMLCanvasElement,
    chartData: ChartData,
    title: string,
    color: string
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { labels, data } = chartData;
    const maxValue = Math.max(...data) * 1.1; // Add 10% padding

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up variables
    const chartHeight = canvas.height - 60; // Leave space for labels and title
    const chartWidth = canvas.width - 60; // Leave space for y-axis labels
    const barSpacing = 10;
    const barWidth =
      (chartWidth - (labels.length + 1) * barSpacing) / labels.length;
    const startX = 50;
    const startY = chartHeight + 30;

    // Draw title
    ctx.fillStyle = "#333";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, 20);

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(startX, 30);
    ctx.lineTo(startX, startY);
    ctx.lineTo(canvas.width - 10, startY);
    ctx.strokeStyle = "#333";
    ctx.stroke();

    // Draw y-axis labels
    ctx.textAlign = "right";
    ctx.font = "12px Arial";
    ctx.fillStyle = "#666";

    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const value = (maxValue * i) / numYLabels;
      const y = startY - (i * chartHeight) / numYLabels;
      ctx.fillText(value.toFixed(0), startX - 5, y + 5);

      // Draw horizontal grid line
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(canvas.width - 10, y);
      ctx.strokeStyle = "#eee";
      ctx.stroke();
    }

    // Draw bars and labels
    labels.forEach((label, index) => {
      const barHeight = (data[index] / maxValue) * chartHeight;
      const x = startX + barSpacing + index * (barWidth + barSpacing);
      const y = startY - barHeight;

      // Draw bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw border
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.strokeRect(x, y, barWidth, barHeight);

      // Draw value on top of bar
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.fillText(data[index].toFixed(1), x + barWidth / 2, y - 5);

      // Draw x-axis label
      ctx.fillStyle = "#666";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      // Rotate label if text is long
      if (label.length > 10) {
        ctx.save();
        ctx.translate(x + barWidth / 2, startY + 5);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(label, 0, 10);
        ctx.restore();
      } else {
        ctx.fillText(label, x + barWidth / 2, startY + 15);
      }
    });
  };

  useEffect(() => {
    if (products.length === 0) return;

    // Draw category distribution chart
    if (categoryChartRef.current) {
      const categoryData = getCategoryData();
      drawBarChart(
        categoryChartRef.current,
        categoryData,
        "Products by Category",
        "rgba(59, 130, 246, 0.7)" // Blue
      );
    }

    // Draw price range chart
    if (priceRangeChartRef.current) {
      const priceRangeData = getPriceRangeData();
      drawBarChart(
        priceRangeChartRef.current,
        priceRangeData,
        "Price Range Distribution",
        "rgba(16, 185, 129, 0.7)" // Green
      );
    }

    // Draw avg price by category chart
    if (priceDistributionRef.current) {
      const avgPriceData = getAvgPriceByCategory();
      drawBarChart(
        priceDistributionRef.current,
        avgPriceData,
        "Average Price by Category",
        "rgba(245, 158, 11, 0.7)" // Amber
      );
    }
  }, [products]);

  return products.length > 0 ? (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">Product Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded p-2">
          <canvas ref={categoryChartRef} width={400} height={300} />
        </div>
        <div className="border rounded p-2">
          <canvas ref={priceRangeChartRef} width={400} height={300} />
        </div>
        <div className="border rounded p-2">
          <canvas ref={priceDistributionRef} width={400} height={300} />
        </div>
      </div>
    </div>
  ) : null;
}
