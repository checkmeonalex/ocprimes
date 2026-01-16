'use client'
import React, { useState } from 'react';
import { categoriesData, filterButtons } from '../data/categoriesData';

const BrowseCategories = () => {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const currentCategories = categoriesData[activeFilter];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h2 className="text-2xl md:text-3xl font-medium text-gray-900">
          Browse by categories
        </h2>
        
        {/* Filter Buttons */}
        <div className="flex gap-2">
          {filterButtons.map((button) => (
            <button
              key={button}
              onClick={() => setActiveFilter(button)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                activeFilter === button
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {button}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {currentCategories.map((category) => (
          <div
            key={category.id}
            className="group cursor-pointer"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 transition-transform duration-300 group-hover:scale-105">
              <img
                src={category.image}
                alt={category.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              
              {/* Category Label */}
              <div className="absolute bottom-4 left-4">
                <span className="inline-block bg-white px-3 py-1.5 rounded-full text-sm font-medium text-gray-900 shadow-sm">
                  {category.name}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseCategories;
