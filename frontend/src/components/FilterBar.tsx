import React from 'react';
import { BrandInfo } from '../types.js';

interface FilterBarProps {
  brands: BrandInfo[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  priceSort: 'none' | 'asc' | 'desc';
  onChangePriceSort: (sort: 'none' | 'asc' | 'desc') => void;
}

const BRAND_COLORS: Record<string, string> = {
  Truper: 'bg-orange-500 text-white border-orange-500',
  Pretul: 'bg-yellow-500 text-gray-900 border-yellow-500',
  Volteck: 'bg-blue-600 text-white border-blue-600',
  Foset: 'bg-teal-600 text-white border-teal-600',
  Fiero: 'bg-red-600 text-white border-red-600',
  Hermex: 'bg-slate-700 text-white border-slate-700',
  Expert: 'bg-neutral-900 text-orange-400 border-neutral-900',
  Klintek: 'bg-emerald-600 text-white border-emerald-600',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  brands,
  selectedBrand,
  onSelectBrand,
  priceSort,
  onChangePriceSort
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        
        {/* Brand Horizontal Scrollable Pills */}
        <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-none flex items-center space-x-2">
          <button
            onClick={() => onSelectBrand('Todas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedBrand === 'Todas'
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
            }`}
          >
            Todas las Marcas
          </button>

          {brands.map((b) => {
            const isSelected = selectedBrand === b.name;
            const badgeStyle = BRAND_COLORS[b.name] || 'bg-gray-800 text-white';
            return (
              <button
                key={b.name}
                onClick={() => onSelectBrand(b.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 ${
                  isSelected
                    ? `${badgeStyle} shadow-md scale-105`
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                <span>{b.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-current' : 'bg-gray-100 text-gray-600'}`}>
                  {b.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          <span className="text-xs font-semibold text-gray-500">Ordenar por precio:</span>
          <select
            value={priceSort}
            onChange={(e) => onChangePriceSort(e.target.value as any)}
            className="text-xs font-semibold bg-white border border-gray-300 text-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="none">Por relevancia</option>
            <option value="asc">Menor a mayor ($ - $$)</option>
            <option value="desc">Mayor a menor ($$ - $)</option>
          </select>
        </div>

      </div>
    </div>
  );
};
