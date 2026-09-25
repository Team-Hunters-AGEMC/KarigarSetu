import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { LanguageCode, SUPPORTED_LANGUAGES } from './translations';

interface LanguageSelectorProps {
  className?: string;
  selectClassName?: string;
  id?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = 'flex items-center gap-1.5 text-[#e6f3eb]',
  selectClassName = 'bg-transparent text-xs text-white border-none outline-none cursor-pointer pr-1 font-medium',
  id = 'language-select',
}) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={className}>
      <Globe className="w-3.5 h-3.5 text-[#f9bc60]" />
      <select
        id={id}
        aria-label="Select preferred language"
        value={language}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className={selectClassName}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-[#0c4b31] text-white">
            {lang.nativeLabel} ({lang.label})
          </option>
        ))}
      </select>
    </div>
  );
};
