import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  totalResults: number;
  loading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, totalResults, loading }) => {
  return (
    <div className="w-full max-w-3xl mx-auto my-4 sm:my-6 px-4">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar por código, clave o descripción (ej: martillo, 100048, PET-15X)..."
          className="w-full pl-11 pr-12 py-3.5 sm:py-4 bg-white rounded-2xl border border-gray-200 shadow-sm text-sm sm:text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 px-2 text-xs text-gray-500 font-medium">
        <span>
          {loading ? (
            <span className="inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span>Buscando en 16,043 productos...</span>
            </span>
          ) : (
            <span>Mostrando {totalResults.toLocaleString()} productos disponibles</span>
          )}
        </span>
        <span className="hidden sm:inline text-gray-400">
          Tip: Puedes buscar claves con guión como <i>MAN-T-1/4</i> o <i>PET-15X</i>
        </span>
      </div>
    </div>
  );
};
