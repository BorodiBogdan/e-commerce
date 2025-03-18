"use client";
import React from "react";

interface ToastProps {
  message: string;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg transition-opacity duration-300">
      {message}
    </div>
  );
};

export default Toast;
