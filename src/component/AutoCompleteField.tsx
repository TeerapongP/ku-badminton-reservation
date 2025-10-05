'use client';

import React, { useState, useRef, useEffect, useId } from 'react';

export const AutoCompleteField: React.FC<AutoCompleteFieldProps> = ({ 
  value,
  onChange, 
  onSearch,
  optionLabel = "label",
  label,
  placeholder = 'พิมพ์เพื่อค้นหา...',
  required = false,
  disabled = false,
  className = "",
  dropdown = false,
  multiple = false,
  debounceMs = 250,
}) => {
  const id = useId();
  const [searchText, setSearchText] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Handle search with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (onSearch) {
        setIsLoading(true);
        try {
          const results = await Promise.resolve(onSearch(searchText));
          setFilteredItems(results || []);
        } catch (error) {
          setFilteredItems([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If no onSearch function, just clear the filtered items
        setFilteredItems([]);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, onSearch, debounceMs]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: any) => {
    onChange?.(item);
    setSearchText('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredItems[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchText('');
    }
  };

  return (
    <div className={`w-full flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          id={id}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-md text-left flex items-center justify-between transition-colors
            ${disabled 
              ? 'bg-gray-100 cursor-not-allowed opacity-60' 
              : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'
            }`}
          type="button"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value || placeholder}
          </span>
          <ChevronDown 
            size={20} 
            className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="ค้นหา..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  กำลังโหลด...
                </div>
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelect(item)}
                    className={`px-3 py-2 cursor-pointer select-none flex items-center justify-between transition-colors ${
                      index === highlightedIndex
                        ? 'bg-indigo-100 text-indigo-700'
                        : value === item
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className={value === item ? 'font-medium' : ''}>
                      {item}
                    </span>
                    {value === item && (
                      <Check size={18} className="text-indigo-600" />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  ไม่พบข้อมูล
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}