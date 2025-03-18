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
    </nav>
  );
}
