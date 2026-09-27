import React from 'react';
import globalBg from '../../assets/karigarsetu-global-background.png';

interface KarigarSetuPageBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * KarigarSetuPageBackground
 * Standard Global Page Background for KarigarSetu:
 * - Uses the approved handcrafted KarigarSetu background artwork (karigarsetu-global-background.png)
 * - Fixed background layer at z-0 behind content
 * - Content layer at relative z-10 so all cards, headers, and UI sit cleanly above it
 * - No opaque background color on parent wrapper that could occlude the background image
 */
export const KarigarSetuPageBackground: React.FC<KarigarSetuPageBackgroundProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative min-h-screen w-full max-w-full ${className}`}>
      {/* Background Layer at z-0 */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-[#F8F2E8] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${globalBg})` }}
        aria-hidden="true"
      />

      {/* Page Content Layer at relative z-10 */}
      <div className="relative z-10 min-h-screen w-full max-w-full flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
};
