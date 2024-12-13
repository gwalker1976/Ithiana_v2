// Pagination.tsx

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages === 0) return null;

  const pages = [];

  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center mt-4 space-x-2">
      {/* Előző oldal gomb */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-md ${
          currentPage === 1
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        aria-label="Előző oldal"
      >
        &larr;
      </button>

      {/* Oldalszámok */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded-md ${
            page === currentPage
              ? 'bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Következő oldal gomb */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-md ${
          currentPage === totalPages
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        aria-label="Következő oldal"
      >
        &rarr;
      </button>
    </div>
  );
};

export default Pagination;