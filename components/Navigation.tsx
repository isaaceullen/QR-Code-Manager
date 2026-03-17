"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <div className="flex gap-4 border-b border-white/10 mb-8">
      <Link
        href="/"
        className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
          pathname === "/" ? "text-white" : "text-white/50 hover:text-white/80"
        }`}
      >
        QR Codes
        {pathname === "/" && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B48EA]"
          />
        )}
      </Link>
      <Link
        href="/links"
        className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
          pathname === "/links" ? "text-white" : "text-white/50 hover:text-white/80"
        }`}
      >
        Links
        {pathname === "/links" && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B48EA]"
          />
        )}
      </Link>
    </div>
  );
}
