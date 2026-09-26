import React from 'react';
import globalBg from '../../assets/karigarsetu-global-background.png';

interface KarigarSetuPageBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * KarigarSetuPageBackground
 * Standard Global Page Background for KarigarSetu:
 * - Uses the approved handcrafted KarigarSetu background artwork
 * - Warm ivory/cream handmade paper texture with terracotta and sage leaf corner accents
 * - Clean spacious center for content readability
 * - Fixed background layer behind content (does not stretch or grow with long pages)
 * - Separate content layer (relative z-10) so all cards, headers, and UI sit cleanly above it
 */
export const KarigarSetuPageBackground: React.FC<KarigarSetuPageBackgroundProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative min-h-screen bg-[#F8F2E8] flex flex-col ${className}`}>
      {/* Fixed Handcrafted Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-[#F8F2E8] bg-no-repeat bg-center bg-cover bg-scroll md:bg-fixed"
        style={{
          backgroundImage: `url(${globalBg})`,
        }}
        aria-hidden="true"
      >
        {/* Subtle translucent overlay (12%) for crisp text contrast while preserving the art */}
        <div className="absolute inset-0 bg-[#fffaf4]/12 pointer-events-none" />
      </div>

      {/* Page Content Layer */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};
