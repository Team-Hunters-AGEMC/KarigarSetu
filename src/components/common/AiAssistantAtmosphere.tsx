import React from 'react';

/**
 * AiAssistantAtmosphere
 * Recreates the premium handcrafted dark emerald atmosphere from the reference:
 * - Deep forest / dark emerald multi-stop background gradient (#073C31 to #052F26)
 * - Faint Indian craft / botanical leaf accents in top-right and bottom-left corners
 * - Muted gold and sage green delicate craft flourishes along perimeter
 * - Clean, distraction-free center for optimal message readability
 * All elements are pointer-events-none and sit strictly behind the functional UI.
 */
export const AiAssistantAtmosphere: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Deep Forest Emerald Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 85% 12%, rgba(217, 164, 65, 0.12), transparent 38%),
            radial-gradient(circle at 15% 88%, rgba(23, 107, 85, 0.22), transparent 44%),
            linear-gradient(175deg, #073C31 0%, #064E3B 32%, #063A2F 68%, #042A22 100%)
          `,
        }}
      />

      {/* 2. Handcrafted Corner Details (SVG) matching the reference */}
      <svg
        viewBox="0 0 420 620"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          {/* Muted Gold Gradient for Foliage Accent */}
          <linearGradient id="craftGoldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5B558" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#C99134" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#8A5F1C" stopOpacity="0.10" />
          </linearGradient>

          {/* Forest Sage Green Gradient for Foliage */}
          <linearGradient id="craftSageLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E866B" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#176B55" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#0B4436" stopOpacity="0.15" />
          </linearGradient>

          {/* Corner Ambient Glow Filter */}
          <filter id="softCraftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* Soft Ambient Light in Top-Right Corner */}
        <circle cx="380" cy="50" r="80" fill="#D9A441" opacity="0.08" filter="url(#softCraftGlow)" />
        <circle cx="30" cy="560" r="90" fill="#176B55" opacity="0.12" filter="url(#softCraftGlow)" />

        {/* ─── TOP-RIGHT BOTANICAL CRAFT FOLIAGE (Reference Match) ─── */}
        <g id="topRightFoliage" opacity="0.85">
          {/* Main Stem */}
          <path
            d="M 430 40 Q 385 85 365 140 T 360 210"
            stroke="url(#craftSageLeaf)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Leaf 1 (Top edge) */}
          <path
            d="M 410 45 C 385 50 375 75 395 82 C 415 75 425 55 410 45 Z"
            fill="url(#craftSageLeaf)"
            stroke="#389B7E"
            strokeWidth="0.8"
            strokeOpacity="0.3"
          />
          {/* Leaf 2 (Gold accent) */}
          <path
            d="M 385 80 C 355 85 350 115 375 120 C 395 115 405 90 385 80 Z"
            fill="url(#craftGoldLeaf)"
            stroke="#E5B558"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
          {/* Leaf 3 (Middle sage) */}
          <path
            d="M 370 125 C 340 135 345 165 370 165 C 390 155 395 135 370 125 Z"
            fill="url(#craftSageLeaf)"
          />
          {/* Leaf 4 (Gold accent smaller) */}
          <path
            d="M 390 155 C 370 168 375 192 392 190 C 405 180 405 165 390 155 Z"
            fill="url(#craftGoldLeaf)"
          />
          {/* Leaf 5 (Lowest sprig) */}
          <path
            d="M 362 185 C 342 195 348 220 366 218 C 380 210 382 195 362 185 Z"
            fill="url(#craftSageLeaf)"
          />

          {/* Subtle gold dots / seeds near sprig */}
          <circle cx="360" cy="115" r="1.8" fill="#E5B558" opacity="0.6" />
          <circle cx="345" cy="155" r="1.5" fill="#E5B558" opacity="0.5" />
          <circle cx="380" cy="205" r="1.6" fill="#E5B558" opacity="0.6" />
        </g>

        {/* ─── BOTTOM-LEFT BOTANICAL CRAFT FOLIAGE (Reference Match) ─── */}
        <g id="bottomLeftFoliage" opacity="0.80">
          {/* Main Stem curving upwards */}
          <path
            d="M -10 590 Q 35 550 55 490 T 60 420"
            stroke="url(#craftSageLeaf)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Leaf 1 (Lowest gold accent) */}
          <path
            d="M 10 575 C 35 565 42 540 22 535 C 5 545 -2 568 10 575 Z"
            fill="url(#craftGoldLeaf)"
            stroke="#E5B558"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />
          {/* Leaf 2 (Sage mid leaf) */}
          <path
            d="M 32 530 C 60 520 65 490 42 485 C 22 495 15 520 32 530 Z"
            fill="url(#craftSageLeaf)"
          />
          {/* Leaf 3 (Gold small accent) */}
          <path
            d="M 28 475 C 50 465 52 445 35 442 C 22 450 18 468 28 475 Z"
            fill="url(#craftGoldLeaf)"
          />
          {/* Leaf 4 (Upper sage sprig) */}
          <path
            d="M 55 480 C 80 470 78 442 58 445 C 42 455 42 472 55 480 Z"
            fill="url(#craftSageLeaf)"
          />
          {/* Leaf 5 (Top tip leaf) */}
          <path
            d="M 58 435 C 75 422 72 402 58 405 C 48 412 48 425 58 435 Z"
            fill="url(#craftSageLeaf)"
          />

          {/* Delicate Indian textile corner border accents (faint dashed arcs) */}
          <path
            d="M 5 615 Q 35 605 55 585 T 75 540"
            stroke="#D9A441"
            strokeWidth="0.8"
            strokeDasharray="2 5"
            strokeOpacity="0.25"
          />
        </g>
      </svg>

      {/* 3. Subtle Inner Vignette & Gold Rim Reflection */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: 'inset 0 0 45px rgba(2, 20, 16, 0.45)',
        }}
      />
    </div>
  );
};
