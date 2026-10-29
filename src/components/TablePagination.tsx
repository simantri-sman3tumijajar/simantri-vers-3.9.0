import React from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100, -1],
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const isAll = pageSize === -1 || pageSize >= totalItems;
  const startItem = isAll ? 1 : Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = isAll ? totalItems : Math.min(currentPage * pageSize, totalItems);
  const safeTotalPages = isAll ? 1 : Math.max(1, totalPages);

  // Generate page numbers array with smart ellipsis
  const getPageNumbers = () => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(safeTotalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    if (currentPage < safeTotalPages - 2) {
      pages.push('...');
    }

    if (!pages.includes(safeTotalPages)) {
      pages.push(safeTotalPages);
    }

    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/90 text-xs text-slate-600 bg-white/50 px-4 py-3 rounded-b-2xl ${className}`}>
      {/* Left side: Rows per page selector & status summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200/80">
          <ListFilter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-semibold text-slate-600 hidden sm:inline">Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-transparent font-extrabold text-slate-800 cursor-pointer focus:outline-none text-xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === -1 ? 'Semua Data' : `${opt} per hal`}
              </option>
            ))}
          </select>
        </div>

        <span className="font-medium text-slate-500">
          Menampilkan <strong className="text-slate-900 font-extrabold">{startItem} - {endItem}</strong> dari <strong className="text-indigo-700 font-extrabold">{totalItems}</strong> data
        </span>
      </div>

      {/* Right side: Page navigation controls */}
      {!isAll && safeTotalPages > 1 && (
        <div className="flex items-center gap-1 self-center sm:self-auto">
          {/* Previous Page Arrow */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 font-bold select-none">
                    ...
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[2rem] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-indigo-500/20 ring-2 ring-indigo-300'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page Arrow */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
            disabled={currentPage >= safeTotalPages}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer flex items-center justify-center"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
};
