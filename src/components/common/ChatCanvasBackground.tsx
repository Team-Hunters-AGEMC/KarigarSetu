import React from 'react';

/**
 * ChatCanvasBackground
 * WhatsApp-style fixed handcrafted background ONLY for the chat body viewport:
 * - Positioned absolute inset-0 with pointer-events-none & z-0
 * - Never scrolls, grows, or stretches when messages are added
 * - Soft ivory / handmade khadi paper texture base
 * - Subtle corner/edge-only artisan motifs (botanical leaf sprigs, terracotta pottery)
 * - Completely unobtrusive center area so chat bubbles remain 100% clear and legible
 */
export const ChatCanvasBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
      {/* 1. Warm Handcrafted Ivory / Khadi Paper Texture Base */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 65% 50% at 50% 25%, rgba(255, 255, 255, 0.85) 0%, transparent 70%),
            radial-gradient(ellipse 70% 60% at 85% 85%, rgba(243, 231, 218, 0.45) 0%, transparent 75%),
            linear-gradient(150deg, #faf5ec 0%, #f6eee3 50%, #ede3d4 100%)
          `,
        }}
      />

      {/* 2. Micro Khadi / Woven Handmade Paper Grain */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #bfae95 0.85px, transparent 0.85px)`,
          backgroundSize: '22px 22px',
        }}
      />

      {/* 3. Top-Left Corner: Subtle Trailing Leafy Botanical Vine */}
      <div className="absolute top-0 left-0 w-32 sm:w-44 h-32 sm:h-44 opacity-35">
        <svg
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMin meet"
          className="w-full h-full"
        >
          {/* Main graceful arching vine */}
          <path d="M0 0 C30 20, 60 55, 95 90 C120 115, 140 145, 150 160" stroke="#5a7d57" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M45 42 C70 30, 100 25, 130 15" stroke="#5a7d57" strokeWidth="1.2" strokeLinecap="round" />

          {/* Soft Sage & Olive Leaves */}
          <path d="M25 20 C14 26, 16 38, 30 40 C38 35, 34 23, 25 20 Z" fill="#7ba577" />
          <path d="M48 44 C38 52, 40 64, 54 66 C62 60, 58 48, 48 44 Z" fill="#658e60" />
          <path d="M72 68 C62 76, 64 88, 78 90 C86 84, 82 72, 72 68 Z" fill="#7ba577" />
          <path d="M96 92 C88 100, 90 110, 102 112 C108 106, 106 96, 96 92 Z" fill="#658e60" />
          <path d="M75 28 C68 20, 78 12, 88 18 C92 24, 84 32, 75 28 Z" fill="#8cb787" />
          <path d="M108 20 C100 12, 110 5, 120 10 C124 16, 116 24, 108 20 Z" fill="#7ba577" />

          {/* Tiny warm terracotta berry dots */}
          <circle cx="34" cy="24" r="2.2" fill="#c9713b" opacity="0.75" />
          <circle cx="58" cy="48" r="2.2" fill="#c9713b" opacity="0.75" />
          <circle cx="82" cy="72" r="2" fill="#c9713b" opacity="0.75" />
        </svg>
      </div>

      {/* 4. Top-Right Corner: Elegant Indian Geometric / Block-Print Craft Motif */}
      <div className="absolute top-2 right-2 w-20 sm:w-28 h-20 sm:h-28 opacity-25">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMaxYMin meet"
          className="w-full h-full"
        >
          {/* Subtle diamond block stamp */}
          <path d="M50 8 L92 50 L50 92 L8 50 Z" stroke="#8d6e46" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M50 20 L80 50 L50 80 L20 50 Z" stroke="#8d6e46" strokeWidth="1" />
          <circle cx="50" cy="50" r="4.5" fill="#c46a36" opacity="0.8" />
          <circle cx="50" cy="20" r="2.2" fill="#8d6e46" />
          <circle cx="80" cy="50" r="2.2" fill="#8d6e46" />
          <circle cx="50" cy="80" r="2.2" fill="#8d6e46" />
          <circle cx="20" cy="50" r="2.2" fill="#8d6e46" />
        </svg>
      </div>

      {/* 5. Bottom-Left Corner: Subtle Terracotta Pottery on Craft Stand */}
      <div className="absolute bottom-0 left-0 w-36 sm:w-48 h-36 sm:h-48 opacity-35">
        <svg
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMax meet"
          className="w-full h-full"
        >
          {/* Wooden craft stand border */}
          <line x1="0" y1="160" x2="160" y2="160" stroke="#7d532f" strokeWidth="2.5" opacity="0.4" />
          <line x1="120" y1="160" x2="120" y2="180" stroke="#633e1c" strokeWidth="2" opacity="0.4" />

          {/* Terracotta Matka / Urn */}
          <path
            d="M50 85 C50 68, 80 68, 80 85 C98 102, 104 135, 92 155 C78 160, 52 160, 38 155 C26 135, 32 102, 50 85 Z"
            fill="#d67843"
          />
          <ellipse cx="65" cy="82" rx="14" ry="4.5" fill="#f09866" />
          <ellipse cx="65" cy="80" rx="11" ry="3" fill="#9f4618" />
          {/* Subtle etched relief patterns */}
          <path d="M40 115 Q 65 124 90 115" stroke="#f6c29d" strokeWidth="1.2" fill="none" opacity="0.8" />
          <path d="M42 130 Q 65 139 88 130" stroke="#f6c29d" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="56" cy="123" r="1.8" fill="#f6c29d" opacity="0.8" />
          <circle cx="65" cy="124" r="1.8" fill="#f6c29d" opacity="0.8" />
          <circle cx="74" cy="123" r="1.8" fill="#f6c29d" opacity="0.8" />

          {/* Small Clay Bowl / Kundan next to it */}
          <ellipse cx="120" cy="154" rx="22" ry="7" fill="#c46631" />
          <ellipse cx="120" cy="152" rx="18" ry="5" fill="#943f14" />
          <path d="M102 154 C104 162, 136 162, 138 154" fill="#a85221" opacity="0.9" />
        </svg>
      </div>

      {/* 6. Bottom-Right Corner: Stacked Traditional Terracotta Pots */}
      <div className="absolute bottom-0 right-0 w-36 sm:w-48 h-36 sm:h-48 opacity-35">
        <svg
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMaxYMax meet"
          className="w-full h-full"
        >
          {/* Wooden craft stand border */}
          <line x1="20" y1="160" x2="180" y2="160" stroke="#7d532f" strokeWidth="2.5" opacity="0.4" />
          <line x1="60" y1="160" x2="60" y2="180" stroke="#633e1c" strokeWidth="2" opacity="0.4" />

          {/* Carved Terracotta Pot */}
          <path
            d="M95 95 C95 78, 140 78, 140 95 C158 112, 162 140, 150 156 C136 160, 104 160, 90 156 C78 140, 82 112, 95 95 Z"
            fill="#c9713b"
          />
          <ellipse cx="118" cy="92" rx="20" ry="6" fill="#e89665" />
          <ellipse cx="118" cy="90" rx="16" ry="4" fill="#8c3e12" />
          {/* Traditional motif lines */}
          <path d="M88 122 Q 118 132 148 122" stroke="#f6c29d" strokeWidth="1.2" fill="none" opacity="0.8" />
          <path d="M92 138 Q 118 147 144 138" stroke="#f6c29d" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="108" cy="130" r="1.8" fill="#f6c29d" opacity="0.8" />
          <circle cx="118" cy="131" r="1.8" fill="#f6c29d" opacity="0.8" />
          <circle cx="128" cy="130" r="1.8" fill="#f6c29d" opacity="0.8" />

          {/* Small Diya Bowl on Top */}
          <ellipse cx="118" cy="72" rx="15" ry="5" fill="#d97d47" />
          <ellipse cx="118" cy="70" rx="12" ry="3.5" fill="#a44b1d" />
        </svg>
      </div>
    </div>
  );
};
