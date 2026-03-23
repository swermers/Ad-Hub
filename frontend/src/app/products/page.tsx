"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const products = [
  {
    name: "Chronos Ivory",
    price: "$1,450",
    stock: 42,
    stockLabel: "42 in stock",
    sku: "CH-092",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAcODxEv1iPFE7-2fQG9yLkTdQGMsUY80_xtWL9kiWMBp349tzNsWZBF_tt_d96MJTHUJ91y6gzrteeZgOaOXcnyywIAWNr2FhuyvDoJ3TZRnNGOK5BjNZY9Im5QK6Ym0CiXbW3TBSun1lUgfXF8E-_XiS7bkQDy49HZ19v5aI-t87BHjruOOHhr_VAJt2q4WaR_-hiFr57EMNtI7IqdQeIiauN-n59s6-OSWdUmOuEDRvuhaAFXv95BcwiQ_SoyHvB_40UEMjAX3Rm",
    error: false,
  },
  {
    name: "Aural Onyx",
    price: "$590",
    stock: 3,
    stockLabel: "Low (3)",
    sku: "AU-112",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA8u0mxLR6SXzmI8pKdZ1yN5PM8px_Jk-d9G1enVgN9HH4pL6CALGT2b4Q8caobEszex1N8bAGVjcro8EyzhaVmPBmGAllmZYKqNaRkp-_AXaDapju1z6D3xTE4S-LdUcpotIOmaPLqCYTwRae0luX-jiTWDzF7_M3qhwOMcJssG5xThHGAucpjrxVGt8Io9DAQ9aC0TX_ocGhpNm1oz0gCzt0XZ5_yXqa1w9gvNPm2HsROQ5ScERAoRGA32ZEO2ZmEgsVUqaNPWvqU",
    error: true,
  },
  {
    name: "Focus Prime",
    price: "$2,100",
    stock: 18,
    stockLabel: "18 in stock",
    sku: "OP-882",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBsCfTHcP_yiN5oR5E8jVGetdHh01UQqhs0yNHADb1R-JWSDdln0RTL-Yc6QhWW8JkdnI1AC6yvj7qn1a26Qrf9Ic7fmFIPlv0kH02mQ0nKd32wpq1juNRjvlWcpyFsN1NZaeNVeR2k1hjEpjYhqvsBUdvNYGLIj0kVJg1EDek8CksX5PVxch2ZGEdMKKtOfZPdzyEvUjX1IOAf1TjAgTw4JdasZpQOzZ3P2c0EVlDn9BK1s0OXq2J6wMHnGirwHfMQcnYfOBi_3BGH",
    error: false,
  },
  {
    name: "Vertex Pen",
    price: "$125",
    stock: 156,
    stockLabel: "156 in stock",
    sku: "VX-001",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB2v1DX8Z-PpSMeJMNQMVT5URTosa4dBUtKyYoYsq2Tq98z-yjMVDLYvK-D0WUM38oh8nrZYjS5fnj8VXp-wIJWjg9sff6LUEdjsyPLw3ES_1xPhibnpAh6IxE7qSS4YlIzcEAjI8hQ60esGHjCD8k7tnVAfNbZ__AtR1MfJQJpY955_EcP3muKP6qZ2ZzMWn5IW9XWUw5aQ-sBjFQpFaViq0AM8eOqKwaAzFCNUtW5WbYStnb4GRr2AUqYUFrDrEw9ZYxMLIYMV6X9",
    error: false,
  },
];

const barHeights = [40, 65, 50, 80, 55, 70, 90, 60];

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#131315] text-[#E5E1E4] px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <p className="text-[#FF9500] text-[10px] uppercase tracking-[0.2em] font-semibold mb-2">
            Inventory Control
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            Product{" "}
            <span className="text-[#554334]/40">Atelier</span>
          </h1>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="glass-prism rounded-full px-5 py-2.5 text-sm font-medium text-[#E5E1E4] border border-[#554334] hover:border-[#FF9500]/60 transition-colors"
          >
            Export CSV
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full px-5 py-2.5 text-sm font-bold bg-[#FF9500] text-[#2d1600] hover:brightness-110 transition"
          >
            + Add Product
          </motion.button>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="glass-prism rounded-2xl p-5 border-l-2 border-[#FF9500]"
        >
          <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50 mb-1">
            Total Valuation
          </p>
          <p className="text-3xl font-black tracking-tight">$2.4M</p>
        </motion.div>

        {/* SKU Count */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="glass-prism rounded-2xl p-5"
        >
          <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50 mb-1">
            SKU Count
          </p>
          <p className="text-3xl font-black tracking-tight">1,204</p>
        </motion.div>

        {/* Live Status */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="glass-prism rounded-2xl p-5 md:col-span-2 flex items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <p className="text-xs uppercase tracking-wider text-[#E5E1E4]/50">
                Live Status
              </p>
            </div>
            <p className="text-3xl font-black tracking-tight">98.2%</p>
          </div>

          {/* Mini bar chart */}
          <div className="flex items-end gap-1 h-12">
            {barHeights.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4, ease: "easeOut" }}
                className="w-1.5 rounded-full bg-[#FF9500]/70"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Product Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product, i) => (
          <motion.div
            key={product.sku}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4 + i}
            className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#1b1b1d] border border-[#353437] hover:border-[#FF9500]/40 transition-colors"
          >
            {/* Product Image */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover grayscale group-hover:grayscale-0 scale-100 group-hover:scale-110 transition-all duration-700 ease-out"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            </div>

            {/* Glass overlay */}
            <div className="absolute inset-x-0 bottom-0 glass-prism p-4 space-y-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg tracking-tight text-[#E5E1E4]">
                  {product.name}
                </h3>
                <span className="text-[#FF9500] font-black text-lg">{product.price}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    product.error
                      ? "text-[#ffb4ab] font-semibold"
                      : "text-[#E5E1E4]/60"
                  }
                >
                  {product.stockLabel}
                </span>
                <span className="text-[#E5E1E4]/40 font-mono">{product.sku}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full mt-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wider border border-[#554334] text-[#E5E1E4]/80 hover:border-[#FF9500] hover:text-[#FF9500] transition-colors"
              >
                Edit Product
              </motion.button>
            </div>
          </motion.div>
        ))}

        {/* Empty State Card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={8}
          className="aspect-[4/5] rounded-2xl border-2 border-dashed border-[#353437] flex flex-col items-center justify-center gap-3 hover:border-[#FF9500]/40 transition-colors cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-[#554334] group-hover:border-[#FF9500] flex items-center justify-center transition-colors">
            <svg
              className="w-5 h-5 text-[#554334] group-hover:text-[#FF9500] transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm text-[#E5E1E4]/40 group-hover:text-[#E5E1E4]/60 transition-colors">
            Add new product
          </p>
        </motion.div>
      </div>

      {/* ── Pagination Footer ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={9}
        className="flex items-center justify-between pt-4 border-t border-[#353437]"
      >
        <p className="text-xs text-[#E5E1E4]/40">
          Showing <span className="text-[#E5E1E4]/70 font-medium">1-4</span> of{" "}
          <span className="text-[#E5E1E4]/70 font-medium">1,204</span> products
        </p>

        <div className="flex gap-1.5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg border border-[#353437] text-[#E5E1E4]/30 flex items-center justify-center text-xs cursor-not-allowed"
            disabled
          >
            &lsaquo;
          </motion.button>
          {[1, 2, 3].map((n) => (
            <motion.button
              key={n}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                n === 1
                  ? "bg-[#FF9500] text-[#2d1600]"
                  : "border border-[#353437] text-[#E5E1E4]/60 hover:border-[#FF9500]/60"
              }`}
            >
              {n}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="w-8 h-8 rounded-lg border border-[#353437] text-[#E5E1E4]/60 flex items-center justify-center text-xs hover:border-[#FF9500]/60 transition-colors"
          >
            &rsaquo;
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
