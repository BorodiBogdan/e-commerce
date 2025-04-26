"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  return (
    <nav className="w-full p-4 bg-blue shadow-md flex justify-between items-center">
      <Link href="/" className="text-xl font-bold">
        BobShop
      </Link>
      <Link
        href="/admin-view"
        className="px-4 py-2 bg-white text-blue-500 font-semibold rounded shadow hover:bg-gray-100"
      >
        Admin Panel
      </Link>
    </nav>
  );
}
