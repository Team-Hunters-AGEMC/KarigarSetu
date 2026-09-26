import React from 'react';

/**
 * ChatCanvasBackground
 * Recreates the exact warm handcrafted studio atmosphere from the reference image:
 * - Fixed background for the chat body (NEVER scrolls or grows with messages)
 * - Warm handmade khadi paper / plaster grain base
 * - Left side: Potted trailing botanical plant on wooden craft shelf & terracotta matkas
 * - Right side: Stacked handcrafted terracotta carved pots & "Good Craft Builds Closer People" craft typography
 * - Subtle Indian block-print accents and warm sunlight lighting
 */
export const ChatCanvasBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
      {/* 1. Warm Handcrafted Ivory / Khadi Paper Base Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 20% 20%, rgba(255, 255, 255, 0.75) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 85% 75%, rgba(240, 222, 202, 0.45) 0%, transparent 70%),
            linear-gradient(145deg, #faf4ec 0%, #f6eee3 45%, #eee3d3 100%)
          `,
        }}
      />

      {/* 2. Micro Textile / Khadi Woven Paper Grain */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle, #bfae95 0.9px, transparent 0.9px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* 3. Left Side: Potted Foliage Plant & Terracotta Urns (Reference Artwork) */}
      <div className="hidden sm:block absolute top-0 bottom-0 left-0 w-44 md:w-56 lg:w-64 opacity-85 z-0">
        <svg
          viewBox="0 0 240 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMinYMid meet"
          className="w-full h-full"
        >
          {/* Wooden Craft Shelf / Stand */}
          <rect x="0" y="240" width="60" height="360" fill="#a47852" opacity="0.35" />
          <line x1="0" y1="240" x2="60" y2="240" stroke="#7d532f" strokeWidth="4" opacity="0.5" />
          <line x1="58" y1="240" x2="58" y2="600" stroke="#633e1c" strokeWidth="3" opacity="0.5" />

          {/* Plant Pot on Stand */}
          <ellipse cx="32" cy="238" rx="26" ry="7" fill="#c9713b" />
          <ellipse cx="32" cy="235" rx="24" ry="5.5" fill="#994c1f" />
          <path d="M10 240 C14 275, 18 295, 22 305 C32 308, 42 308, 52 305 C56 295, 60 275, 64 240 Z" fill="#b85f2d" />
          <path d="M14 258 Q 32 264 50 258" stroke="#f6c29d" strokeWidth="1.2" fill="none" opacity="0.75" />

          {/* Trailing Green Foliage Vines */}
          <path d="M32 230 C20 180, 45 130, 25 80" stroke="#3d5a3c" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 230 C45 190, 70 160, 85 120" stroke="#3d5a3c" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 230 C28 260, 40 290, 36 330" stroke="#486947" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 230 C15 260, 10 290, 16 340" stroke="#486947" strokeWidth="1.8" strokeLinecap="round" />

          {/* Leaves with Rich Green Tones */}
          <path d="M25 80 C12 88, 14 105, 30 110 C42 102, 38 88, 25 80 Z" fill="#67975d" stroke="#2d482c" strokeWidth="0.8" />
          <path d="M85 120 C98 128, 96 148, 80 152 C68 144, 72 128, 85 120 Z" fill="#7dae72" stroke="#2d482c" strokeWidth="0.8" />
          <path d="M38 145 C22 152, 24 172, 42 176 C54 168, 50 152, 38 145 Z" fill="#588550" stroke="#2d482c" strokeWidth="0.8" />
          <path d="M60 170 C74 176, 76 195, 60 200 C48 194, 50 178, 60 170 Z" fill="#67975d" stroke="#2d482c" strokeWidth="0.8" />
          <path d="M36 330 C22 336, 26 352, 40 355 C50 348, 46 336, 36 330 Z" fill="#7dae72" stroke="#2d482c" strokeWidth="0.8" />
          <path d="M16 340 C4 348, 8 362, 22 365 C30 358, 26 346, 16 340 Z" fill="#588550" stroke="#2d482c" strokeWidth="0.8" />

          {/* Lower Terracotta Matka / Clay Pitcher on Ground */}
          <path
            d="M32 440 C32 418, 58 418, 58 440 C76 460, 82 505, 68 535 C52 542, 36 542, 20 535 C6 505, 12 460, 32 440 Z"
            fill="#d67843"
          />
          <ellipse cx="45" cy="436" rx="15" ry="5" fill="#f09866" />
          <ellipse cx="45" cy="434" rx="12" ry="3.5" fill="#9f4618" />
          {/* Etched tribal patterns */}
          <path d="M18 475 Q 45 486 72 475" stroke="#f6c29d" strokeWidth="1.4" fill="none" opacity="0.8" />
          <path d="M16 495 Q 45 506 74 495" stroke="#f6c29d" strokeWidth="1.4" fill="none" opacity="0.8" />
          <circle cx="34" cy="485" r="2.2" fill="#f6c29d" opacity="0.8" />
          <circle cx="45" cy="486" r="2.2" fill="#f6c29d" opacity="0.8" />
          <circle cx="56" cy="485" r="2.2" fill="#f6c29d" opacity="0.8" />
        </svg>
      </div>

      {/* 4. Right Side: Stacked Terracotta Pots & "Good Craft Builds Closer People" Script (Reference Artwork) */}
      <div className="hidden md:block absolute top-0 bottom-0 right-0 w-56 lg:w-72 opacity-85 z-0">
        <svg
          viewBox="0 0 280 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMaxYMid meet"
          className="w-full h-full"
        >
          {/* Traditional Craft Calligraphy matching the Reference Image */}
          <g opacity="0.75" transform="translate(65, 175)">
            <text x="0" y="0" fontFamily="serif" fontStyle="italic" fontSize="26" fill="#8d5f39" letterSpacing="0.05em">
              Good
            </text>
            <text x="0" y="32" fontFamily="serif" fontSize="28" fontWeight="600" fill="#784825" letterSpacing="0.04em">
              Craft
            </text>
            <text x="0" y="64" fontFamily="serif" fontSize="26" fontWeight="600" fill="#784825" letterSpacing="0.04em">
              Builds
            </text>
            <text x="0" y="96" fontFamily="serif" fontStyle="italic" fontSize="26" fill="#8d5f39" letterSpacing="0.05em">
              Closer
            </text>
            <text x="0" y="128" fontFamily="serif" fontSize="28" fontWeight="600" fill="#784825" letterSpacing="0.04em">
              People
            </text>
          </g>

          {/* Botanical Vine branch trailing on right wall */}
          <path d="M260 0 C245 60, 220 120, 240 180" stroke="#71866e" strokeWidth="2" strokeLinecap="round" />
          <path d="M245 45 C230 42, 225 58, 238 64 C248 60, 250 50, 245 45 Z" fill="#849b81" />
          <path d="M232 95 C215 98, 212 114, 226 118 C236 114, 238 102, 232 95 Z" fill="#71876e" />
          <path d="M235 145 C220 150, 218 166, 232 170 C240 166, 242 154, 235 145 Z" fill="#849b81" />

          {/* Hand-Carved Terracotta Pots / Bowls Stacked on Right Base */}
          <g transform="translate(140, 360)">
            {/* Wooden Base Pedestal */}
            <rect x="0" y="190" width="140" height="50" fill="#875e3c" opacity="0.35" />
            <line x1="0" y1="190" x2="140" y2="190" stroke="#684224" strokeWidth="3" opacity="0.5" />

            {/* Bottom Large Terracotta Urn */}
            <path
              d="M20 90 C20 65, 80 65, 80 90 C105 110, 115 155, 95 185 C75 192, 45 192, 25 185 C5 155, 10 110, 20 90 Z"
              fill="#c86d38"
            />
            <ellipse cx="50" cy="85" rx="32" ry="9" fill="#e58f58" />
            <ellipse cx="50" cy="83" rx="28" ry="6.5" fill="#8c3e12" />
            {/* Intricate relief carvings on pot */}
            <path d="M12 125 Q 50 140 88 125" stroke="#f6c29d" strokeWidth="1.6" fill="none" opacity="0.8" />
            <path d="M15 148 Q 50 162 85 148" stroke="#f6c29d" strokeWidth="1.6" fill="none" opacity="0.8" />
            <circle cx="34" cy="137" r="2.5" fill="#f6c29d" opacity="0.8" />
            <circle cx="50" cy="138" r="2.5" fill="#f6c29d" opacity="0.8" />
            <circle cx="66" cy="137" r="2.5" fill="#f6c29d" opacity="0.8" />

            {/* Small Terracotta Diya / Bowl on top of urn */}
            <ellipse cx="50" cy="55" rx="28" ry="9" fill="#dd8149" />
            <ellipse cx="50" cy="53" rx="24" ry="6" fill="#a44b1d" />
            <ellipse cx="50" cy="52" rx="20" ry="4" fill="#75300b" />
          </g>
        </svg>
      </div>

      {/* 5. Center-Top Indian Craft Geometric Diamond Stamp */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 opacity-15 pointer-events-none">
        <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M30 5 L55 30 L30 55 L5 30 Z" stroke="#8d6e46" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
          <path d="M30 15 L45 30 L30 45 L15 30 Z" stroke="#8d6e46" strokeWidth="1" fill="none" />
          <circle cx="30" cy="30" r="3" fill="#c46a36" />
        </svg>
      </div>
    </div>
  );
};
