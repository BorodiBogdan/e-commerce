import Image from "next/image";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  isHighestPrice?: boolean;
  isLowestPrice?: boolean;
  isAveragePrice?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  image,
  description,
  category,
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
      <div className="relative h-48 w-full">
        <Image src={image} alt={name} fill className="object-cover" />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => onEdit(id)}
            className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(id)}
            className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
        <p className="text-gray-600 text-sm mt-1">{description}</p>
        <div className="flex justify-between items-center mt-2">
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
            ${price.toFixed(2)}
          </p>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {category}
          </span>
        </div>
        {(isHighestPrice || isLowestPrice || isAveragePrice) && (
          <div className="mt-2">
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
      </div>
    </div>
  );
}
