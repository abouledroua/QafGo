import React from 'react';

export default function QafGoLogo({ className = 'w-10 h-10', showText = true, size = 'default' }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Modern Styled SVG Fusion: Arabic Letter Qaf (ق) + Open Mushaf + Forward Motion Rays */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md transition-transform hover:scale-105"
        >
          {/* Background Rounded Shield with Gradient */}
          <defs>
            <linearGradient id="qafgoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
            <linearGradient id="pagesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Rounded Hexagonal / Shield Base */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#qafgoGradient)"
          />

          {/* Forward Speed / Momentum Rings & Geometric Accents */}
          <path
            d="M82 22 L72 32 M88 34 L78 44"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />

          {/* Open Mushaf Pages forming the base curve of the letter Qaf (ق) */}
          {/* Left Wing / Page */}
          <path
            d="M50 68 C40 60, 24 64, 18 74 C26 56, 38 48, 50 56 Z"
            fill="url(#pagesGradient)"
          />
          {/* Right Wing / Page */}
          <path
            d="M50 68 C60 60, 76 64, 82 74 C74 56, 62 48, 50 56 Z"
            fill="url(#pagesGradient)"
          />

          {/* Stylized Loop of Letter Qaf (Head of Qaf merging into the Quran holder) */}
          <path
            d="M50 56 C38 56, 32 44, 38 35 C43 27, 57 27, 62 35 C66 42, 60 52, 50 56 Z"
            fill="#ffffff"
          />

          {/* Inner cutout of the Qaf loop */}
          <circle cx="50" cy="40" r="5.5" fill="var(--color-primary)" />

          {/* Two Diacritical Jewels / Dots of the Letter Qaf (رمز النقطتين بحلي هندسية تدل على الريادة والسرعة) */}
          <circle cx="43" cy="22" r="4" fill="#ffffff" />
          <circle cx="57" cy="22" r="4" fill="#ffffff" />

          {/* Centered Bookmark Ribbon (شريط الفاصل المرجعي للمصحف الشريف) */}
          <path
            d="M48 56 L50 78 L52 56 Z"
            fill="var(--color-primary)"
            opacity="0.8"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-2xl tracking-tight text-text-main font-cairo">
              قاف <span className="text-primary font-black">غو</span>
            </span>
            <span className="px-1.5 py-0.5 text-[11px] font-bold uppercase rounded-md bg-primary/10 text-primary border border-primary/20">
              QafGo
            </span>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            المنظومة التعليمية والقرآنية المتكاملة
          </span>
        </div>
      )}
    </div>
  );
}
