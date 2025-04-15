import Image from "next/image";
import { Product } from "../../types";

interface ProductCardProps {
  product: Product;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  isHighestPrice?: boolean;
  isLowestPrice?: boolean;
  isAveragePrice?: boolean;
}

export default function ProductCard({
  product,
  onDelete,
  onEdit,
  isHighestPrice,
  isLowestPrice,
  isAveragePrice,
}: ProductCardProps) {
  // Determine the border color based on price status
  const getBorderClass = () => {
    if (isHighestPrice) return "border-green-500 border-2";
    if (isLowestPrice) return "border-red-500 border-2";
    if (isAveragePrice) return "border-blue-500 border-2";
    return "";
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden ${getBorderClass()}`}
    >
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
        <p className="text-gray-600 mb-2">{product.description}</p>
        <div className="flex justify-between items-center mb-2">
          <p
            className={`text-xl font-bold ${
              isHighestPrice
                ? "text-green-600"
                : isLowestPrice
                ? "text-red-600"
                : isAveragePrice
                ? "text-blue-600"
                : "text-blue-600"
            }`}
          >
            ${product.price.toFixed(2)}
          </p>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {product.category}
          </span>
        </div>
        {(isHighestPrice || isLowestPrice || isAveragePrice) && (
          <div className="mb-4">
            {isHighestPrice && (
              <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                Highest Price
              </span>
            )}
            {isLowestPrice && (
              <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded">
                Lowest Price
              </span>
            )}
            {isAveragePrice && (
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Average Price
              </span>
            )}
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onEdit(product.id)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
