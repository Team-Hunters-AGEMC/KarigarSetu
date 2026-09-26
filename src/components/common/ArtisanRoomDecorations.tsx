import React from 'react';

/**
 * ArtisanRoomDecorations
 * Recreates the warm, handcrafted studio atmosphere from Reference Image 2:
 * - Hanging woven bamboo/cane wicker pendant lamp (top-left)
 * - Potted lush tropical plant in an etched terracotta planter (left edge)
 * - Terracotta clay pottery (matka, vase, and bowl) on warm woven surface (bottom edges)
 * - Trailing leafy botanical foliage (top-right)
 * - Sunlight beam and rattan weave texture
 * All decorative elements are strictly pointer-events-none and positioned outside/behind functional UI.
 */
export const ArtisanRoomDecorations: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Sunlight Beam Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 10% 0%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 247, 235, 0.45) 45%, rgba(243, 232, 218, 0.2) 75%, transparent 100%)',
        }}
      />

      {/* 2. Natural Woven Jute / Rattan Table Strip along bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 sm:h-36 opacity-35"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(214, 192, 163, 0.35) 40%, rgba(184, 156, 120, 0.6) 100%)',
          backgroundImage: `radial-gradient(circle, #b99a70 1.2px, transparent 1.2px), radial-gradient(circle, #8d6e46 1.2px, transparent 1.2px)`,
          backgroundSize: '16px 16px, 16px 16px',
          backgroundPosition: '0 0, 8px 8px',
        }}
      />

      {/* 3. Top-Left: Hanging Woven Bamboo / Cane Pendant Lamp */}
      <div className="hidden lg:block absolute -top-4 left-6 xl:left-12 w-28 xl:w-36 h-80 z-0">
        <svg viewBox="0 0 140 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Suspension Cord */}
          <line x1="70" y1="0" x2="70" y2="90" stroke="#7a552e" strokeWidth="2.5" strokeDasharray="3 2" />
          <circle cx="70" cy="90" r="4" fill="#583c20" />

          {/* Lamp Shade Cap */}
          <ellipse cx="70" cy="98" rx="14" ry="4" fill="#a46c37" />

          {/* Woven Bell Lamp Shade */}
          <path
            d="M56 98 C50 140, 20 190, 16 230 C45 242, 95 242, 124 230 C120 190, 90 140, 84 98 Z"
            fill="url(#caneGradient)"
          />

          {/* Wicker Crisscross Weave Texture */}
          <path d="M50 115 Q 70 125 90 115" stroke="#77491d" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M42 140 Q 70 155 98 140" stroke="#77491d" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M34 170 Q 70 190 106 170" stroke="#77491d" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M26 200 Q 70 225 114 200" stroke="#77491d" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M18 226 Q 70 248 122 226" stroke="#77491d" strokeWidth="2" fill="none" opacity="0.7" />

          {/* Vertical Ribs */}
          <path d="M70 98 Q 70 170 70 240" stroke="#683d16" strokeWidth="1.8" opacity="0.6" />
          <path d="M62 98 Q 50 165 42 236" stroke="#683d16" strokeWidth="1.8" opacity="0.6" />
          <path d="M78 98 Q 90 165 98 236" stroke="#683d16" strokeWidth="1.8" opacity="0.6" />
          <path d="M56 100 Q 30 168 22 230" stroke="#683d16" strokeWidth="1.8" opacity="0.6" />
          <path d="M84 100 Q 110 168 118 230" stroke="#683d16" strokeWidth="1.8" opacity="0.6" />

          {/* Warm Amber Glow Emitted Under Lamp */}
          <ellipse cx="70" cy="245" rx="55" ry="25" fill="url(#lampGlow)" opacity="0.55" />

          <defs>
            <linearGradient id="caneGradient" x1="16" y1="98" x2="124" y2="230" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e3af72" />
              <stop offset="0.45" stopColor="#c88b48" />
              <stop offset="1" stopColor="#9a622a" />
            </linearGradient>
            <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffd88a" />
              <stop offset="1" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* 4. Left Edge: Lush Potted Plant in Handcrafted Terracotta Planter */}
      <div className="hidden lg:block absolute bottom-4 left-3 xl:left-8 w-36 xl:w-44 h-84 z-0">
        <svg viewBox="0 0 160 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
          {/* Stems */}
          <path d="M80 200 C75 160 55 120 40 85" stroke="#3d5a3c" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 200 C80 145 75 95 72 45" stroke="#334f32" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M80 200 C90 155 110 120 128 80" stroke="#3d5a3c" strokeWidth="3" strokeLinecap="round" />
          <path d="M80 200 C68 165 42 150 20 135" stroke="#3d5a3c" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M80 200 C95 170 125 155 148 140" stroke="#3d5a3c" strokeWidth="2.5" strokeLinecap="round" />

          {/* Tropical Leaves - Rich Sunlight Highlights */}
          {/* Top Leaf */}
          <path
            d="M72 45 C60 50, 48 70, 72 105 C96 70, 84 50, 72 45 Z"
            fill="url(#leafGrad1)"
            stroke="#2d482c"
            strokeWidth="1.2"
          />
          <path d="M72 45 L72 105" stroke="#1f361f" strokeWidth="1" opacity="0.6" />

          {/* Upper Left Leaf */}
          <path
            d="M40 85 C25 95, 18 120, 46 145 C66 120, 55 95, 40 85 Z"
            fill="url(#leafGrad2)"
            stroke="#2d482c"
            strokeWidth="1.2"
          />

          {/* Upper Right Leaf */}
          <path
            d="M128 80 C144 92, 148 118, 122 142 C102 118, 112 92, 128 80 Z"
            fill="url(#leafGrad1)"
            stroke="#2d482c"
            strokeWidth="1.2"
          />

          {/* Mid-Left Arching Leaf */}
          <path
            d="M20 135 C5 148, 8 175, 36 185 C52 165, 38 145, 20 135 Z"
            fill="url(#leafGrad2)"
            stroke="#2d482c"
            strokeWidth="1.2"
          />

          {/* Mid-Right Arching Leaf */}
          <path
            d="M148 140 C162 152, 156 180, 130 188 C115 168, 130 150, 148 140 Z"
            fill="url(#leafGrad1)"
            stroke="#2d482c"
            strokeWidth="1.2"
          />

          {/* Terracotta Planter Pot */}
          {/* Rim */}
          <ellipse cx="80" cy="202" rx="36" ry="7" fill="#d97a44" />
          <ellipse cx="80" cy="200" rx="34" ry="5.5" fill="#ab5424" />

          {/* Pot Body */}
          <path
            d="M47 205 C50 250, 54 280, 56 295 C72 298, 88 298, 104 295 C106 280, 110 250, 113 205 Z"
            fill="url(#potGradient)"
          />

          {/* Tribal / Geometric Engraved Bands on Terracotta */}
          <path d="M50 225 Q 80 232 110 225" stroke="#f6c29d" strokeWidth="1.5" fill="none" opacity="0.75" />
          <path d="M52 245 Q 80 252 108 245" stroke="#f6c29d" strokeWidth="1.5" fill="none" opacity="0.75" />
          {/* Diamond tribal stamps */}
          <circle cx="65" cy="235" r="2.2" fill="#f6c29d" opacity="0.8" />
          <circle cx="80" cy="236" r="2.2" fill="#f6c29d" opacity="0.8" />
          <circle cx="95" cy="235" r="2.2" fill="#f6c29d" opacity="0.8" />

          <defs>
            <linearGradient id="leafGrad1" x1="40" y1="40" x2="140" y2="150" gradientUnits="userSpaceOnUse">
              <stop stopColor="#67975d" />
              <stop offset="0.6" stopColor="#3d6837" />
              <stop offset="1" stopColor="#294825" />
            </linearGradient>
            <linearGradient id="leafGrad2" x1="20" y1="70" x2="80" y2="170" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7dae72" />
              <stop offset="0.5" stopColor="#4e7d48" />
              <stop offset="1" stopColor="#2c4d28" />
            </linearGradient>
            <linearGradient id="potGradient" x1="45" y1="200" x2="115" y2="295" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e3854e" />
              <stop offset="0.45" stopColor="#bd6431" />
              <stop offset="1" stopColor="#8d4016" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 5. Top-Right: Trailing Dried Leaf & Botanical Branch */}
      <div className="hidden lg:block absolute -top-4 right-4 xl:right-12 w-32 xl:w-40 h-64 z-0">
        <svg viewBox="0 0 150 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-80">
          <path d="M140 0 C120 40 95 100 70 170 C60 195 45 225 35 240" stroke="#71866e" strokeWidth="2" strokeLinecap="round" />
          {/* Leaves along branch */}
          <path d="M125 35 C105 32, 98 48, 115 55 C128 52, 130 40, 125 35 Z" fill="#849b81" />
          <path d="M110 75 C88 78, 85 96, 102 100 C114 96, 116 82, 110 75 Z" fill="#71876e" />
          <path d="M90 115 C72 120, 70 138, 86 142 C98 138, 98 124, 90 115 Z" fill="#849b81" />
          <path d="M72 155 C55 162, 54 178, 68 182 C78 178, 78 165, 72 155 Z" fill="#6c8269" />
          <path d="M52 195 C38 202, 38 216, 48 220 C57 217, 57 205, 52 195 Z" fill="#5e745b" />
          {/* Tiny craft berries */}
          <circle cx="106" cy="62" r="3" fill="#d97706" opacity="0.8" />
          <circle cx="84" cy="102" r="3" fill="#d97706" opacity="0.8" />
          <circle cx="68" cy="144" r="3" fill="#d97706" opacity="0.8" />
        </svg>
      </div>

      {/* 6. Bottom-Right: Terracotta Clay Bowl & Handcrafted Urn */}
      <div className="hidden xl:block absolute bottom-3 right-6 w-36 h-36 z-0">
        <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Wide Clay Bowl / Diya */}
          <ellipse cx="65" cy="115" rx="42" ry="14" fill="#c46a36" />
          <ellipse cx="65" cy="111" rx="38" ry="10" fill="#934316" />
          <ellipse cx="65" cy="110" rx="34" ry="7" fill="#6e2d09" />
          {/* Relief pattern on bowl rim */}
          <path d="M28 116 Q 65 125 102 116" stroke="#f6ba95" strokeWidth="1.2" fill="none" opacity="0.8" />

          {/* Small Terracotta Matka / Pot behind bowl */}
          <path
            d="M95 85 C95 72, 115 72, 115 85 C125 95, 128 112, 120 122 C112 125, 98 125, 90 122 C82 112, 85 95, 95 85 Z"
            fill="#db7a42"
          />
          <ellipse cx="105" cy="84" rx="10" ry="3.5" fill="#f19d6c" />
          <ellipse cx="105" cy="83" rx="8" ry="2.5" fill="#a44b1d" />
        </svg>
      </div>
    </div>
  );
};
