import React from 'react';

/**
 * AiAssistantAtmosphere
 * Recreates the dark futuristic AI visual atmosphere from Reference Image 1:
 * - Deep navy + dark teal multi-layered radial/linear gradients
 * - Flowing 3D digital wave / mesh ribbon across lower & side areas
 * - Glowing cyan and mint-green particles with subtle blur aura
 * - Glowing cyan line-art artisan pottery (matka, foliage, and bowl)
 * - Subtle vignette and light blooms
 * All elements are pointer-events-none and sit strictly behind functional UI.
 */
export const AiAssistantAtmosphere: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Deep Navy + Dark Teal Base Gradients with Cyan/Emerald Blooms */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 75% 18%, rgba(34, 211, 238, 0.24), transparent 42%),
            radial-gradient(circle at 25% 65%, rgba(16, 185, 129, 0.18), transparent 48%),
            radial-gradient(circle at 50% 90%, rgba(6, 182, 212, 0.22), transparent 55%),
            linear-gradient(150deg, #02121b 0%, #052636 45%, #02141f 100%)
          `,
        }}
      />

      {/* 2. Flowing Digital Mesh Wave Ribbon & Glowing Particles (Reference 1) */}
      <svg
        viewBox="0 0 420 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-90"
      >
        <defs>
          {/* Cyan/Teal Gradient for Continuous Flow Lines */}
          <linearGradient id="waveCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
          </linearGradient>

          {/* Secondary Teal/Emerald Gradient */}
          <linearGradient id="waveEmeraldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
          </linearGradient>

          {/* Volumetric Under-Wave Glow Fill */}
          <linearGradient id="volumetricWaveGlow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
            <stop offset="70%" stopColor="#0d9488" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>

          {/* Soft Blur Filter for Glowing Light Particles */}
          <filter id="cyanGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="softHaloFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Soft Ambient Light Orbs */}
        <circle cx="310" cy="110" r="70" fill="#06b6d4" opacity="0.14" filter="url(#softHaloFilter)" />
        <circle cx="110" cy="380" r="85" fill="#10b981" opacity="0.10" filter="url(#softHaloFilter)" />
        <circle cx="340" cy="460" r="95" fill="#22d3ee" opacity="0.16" filter="url(#softHaloFilter)" />

        {/* Volumetric Wave Ribbon Fill */}
        <path
          d="M -30 500 C 60 540, 140 520, 220 440 C 300 360, 360 320, 440 350 L 440 620 L -30 620 Z"
          fill="url(#volumetricWaveGlow)"
        />

        {/* Layer 1: Smooth Continuous Wave Curvature (Solid Flow) */}
        <path
          d="M -30 500 C 70 540, 150 515, 230 435 C 310 355, 370 315, 450 345"
          stroke="url(#waveCyanGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M -30 475 C 80 520, 170 485, 250 405 C 320 330, 380 290, 450 315"
          stroke="url(#waveEmeraldGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M -30 450 C 90 495, 190 455, 270 375 C 330 305, 390 265, 450 285"
          stroke="url(#waveCyanGrad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M -30 425 C 100 470, 210 425, 290 345 C 340 280, 400 240, 450 255"
          stroke="url(#waveEmeraldGrad)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Layer 2: Digital Dotted Wave Contours (Signature Matrix Effect from Reference 1) */}
        <path
          d="M -30 515 C 65 555, 145 530, 225 450 C 305 370, 365 330, 450 360"
          stroke="#22d3ee"
          strokeWidth="1.6"
          strokeDasharray="2 7"
          opacity="0.85"
        />
        <path
          d="M -30 488 C 75 532, 160 500, 240 420 C 315 345, 375 305, 450 330"
          stroke="#67e8f9"
          strokeWidth="1.4"
          strokeDasharray="2.5 8"
          opacity="0.8"
        />
        <path
          d="M -30 462 C 85 508, 180 470, 260 390 C 325 320, 385 278, 450 300"
          stroke="#34d399"
          strokeWidth="1.2"
          strokeDasharray="2 6"
          opacity="0.7"
        />
        <path
          d="M -30 438 C 95 482, 200 440, 280 360 C 335 295, 395 252, 450 270"
          stroke="#06b6d4"
          strokeWidth="1.2"
          strokeDasharray="3 9"
          opacity="0.6"
        />
        <path
          d="M -30 412 C 105 458, 220 410, 300 330 C 345 268, 405 228, 450 240"
          stroke="#22d3ee"
          strokeWidth="1"
          strokeDasharray="1.5 6"
          opacity="0.5"
        />
        <path
          d="M -30 388 C 115 432, 240 380, 320 300 C 355 240, 415 200, 450 212"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="2 8"
          opacity="0.4"
        />

        {/* Layer 3: Glowing Digital Particles with Blur Auras */}
        {/* Prominent Glowing Cyan Nodes */}
        <circle cx="230" cy="435" r="2.8" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="230" cy="435" r="1.6" fill="#22d3ee" />

        <circle cx="310" cy="355" r="3" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="310" cy="355" r="1.8" fill="#38bdf8" />

        <circle cx="370" cy="315" r="2.5" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="370" cy="315" r="1.5" fill="#22d3ee" />

        <circle cx="160" cy="495" r="2.6" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="160" cy="495" r="1.5" fill="#34d399" />

        <circle cx="270" cy="375" r="2.4" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="270" cy="375" r="1.4" fill="#67e8f9" />

        <circle cx="390" cy="265" r="2.5" fill="#ffffff" filter="url(#cyanGlowFilter)" />
        <circle cx="390" cy="265" r="1.5" fill="#22d3ee" />

        {/* Ambient Scattered Particles across the Dark Atmosphere */}
        <circle cx="65" cy="180" r="1.6" fill="#22d3ee" opacity="0.75" />
        <circle cx="130" cy="270" r="1.8" fill="#34d399" opacity="0.65" />
        <circle cx="85" cy="360" r="2" fill="#38bdf8" opacity="0.8" />
        <circle cx="195" cy="220" r="1.5" fill="#67e8f9" opacity="0.7" />
        <circle cx="290" cy="160" r="2.2" fill="#22d3ee" opacity="0.85" />
        <circle cx="350" cy="130" r="1.5" fill="#34d399" opacity="0.6" />
        <circle cx="380" cy="210" r="2" fill="#38bdf8" opacity="0.75" />
        <circle cx="340" cy="430" r="2.4" fill="#22d3ee" opacity="0.8" />
        <circle cx="390" cy="480" r="1.8" fill="#34d399" opacity="0.7" />
        <circle cx="110" cy="530" r="2" fill="#38bdf8" opacity="0.75" />
        <circle cx="255" cy="510" r="1.6" fill="#22d3ee" opacity="0.7" />
      </svg>

      {/* 3. Glowing Cyan Line-Art Artisan Craft (Bottom-Left from Reference 1) */}
      <div className="absolute bottom-16 left-3 w-28 h-28 pointer-events-none opacity-30 select-none">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Foliage Sprigs behind Matka */}
          <path d="M60 70 C55 45, 40 25, 30 15" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M60 70 C60 40, 65 20, 68 8" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M60 70 C65 45, 80 25, 90 15" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" />

          {/* Leaves */}
          <path d="M30 15 C24 22, 28 32, 38 30 C42 22, 36 16, 30 15 Z" fill="#06b6d4" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="1" />
          <path d="M68 8 C62 16, 64 26, 74 24 C78 16, 72 10, 68 8 Z" fill="#06b6d4" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="1" />
          <path d="M90 15 C84 22, 88 32, 98 30 C102 22, 96 16, 90 15 Z" fill="#06b6d4" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="1" />

          {/* Handcrafted Terracotta Pot / Matka */}
          <path
            d="M48 55 C48 42, 72 42, 72 55 C84 66, 88 92, 76 104 C66 108, 54 108, 44 104 C32 92, 36 66, 48 55 Z"
            stroke="#22d3ee"
            strokeWidth="1.4"
            fill="#062534"
            fillOpacity="0.6"
          />
          {/* Rim */}
          <ellipse cx="60" cy="52" rx="14" ry="4" stroke="#22d3ee" strokeWidth="1.2" fill="#083042" />
          <ellipse cx="60" cy="51" rx="10" ry="2.5" stroke="#22d3ee" strokeWidth="0.8" />

          {/* Etched tribal pattern on pot */}
          <path d="M38 74 Q 60 82 82 74" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M40 85 Q 60 93 80 85" stroke="#22d3ee" strokeWidth="1" />
          <path d="M45 92 Q 60 98 75 92" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" />

          {/* Small Carved Bowl next to pot */}
          <ellipse cx="88" cy="100" rx="18" ry="6" stroke="#22d3ee" strokeWidth="1.2" fill="#083042" />
          <path d="M72 100 C74 108, 102 108, 104 100" stroke="#22d3ee" strokeWidth="1.2" />
        </svg>
      </div>

      {/* 4. Subtle Vignette around the Panel Border for Cinematic Polish */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 65%, rgba(2, 12, 19, 0.55) 100%)',
        }}
      />
    </div>
  );
};
