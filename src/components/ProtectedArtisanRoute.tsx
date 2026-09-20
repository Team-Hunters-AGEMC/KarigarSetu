import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getLoggedInArtisan, logoutArtisan, setCurrentArtisan } from '../data/seedData';
import { ArtisanProfile, CraftCategory } from '../types';

export const ProtectedArtisanRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState<'checking' | 'allowed' | 'login'>('checking');

  useEffect(() => {
    const controller = new AbortController();
    setState('checking');
    const handleArtisanUpdate = () => {
      if (!getLoggedInArtisan()) {
        controller.abort();
        setState('login');
      }
    };
    window.addEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);

    fetch('/api/artisans/me', { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Artisan login required');
        const result = await response.json();
        if (!result.authenticated || !result.artisan) throw new Error('Artisan login required');

        const verified = result.artisan;
        const cached = getLoggedInArtisan();
        if (!cached || cached.id !== verified.id) {
          setCurrentArtisan({
            id: verified.id,
            name: verified.name,
            phone: verified.phone,
            language: verified.language,
            craftType: verified.craft_type as CraftCategory,
            location: verified.location,
            experience: verified.experience,
          } as ArtisanProfile);
        }
        if (!controller.signal.aborted) setState('allowed');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        logoutArtisan();
        setState('login');
      });

    return () => {
      controller.abort();
      window.removeEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);
    };
  }, [location.pathname]);

  if (state === 'checking') {
    return <div className="grid min-h-[60vh] place-items-center font-bold text-[#0c4b31]">Checking Artisan login…</div>;
  }
  if (state === 'login') {
    return <Navigate to="/artisan/register" replace state={{ from: location.pathname, message: 'Artisan Studio ব্যবহার করতে আগের account-এ login করুন।' }} />;
  }
  return <>{children}</>;
};
