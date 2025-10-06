'use client';

import React, { useState, useEffect } from 'react';
import { AutoComplete } from 'primereact/autocomplete';
import { AutoCompleteComponentProps } from '@/lib/AutoCompleteFieldProps';

export const AutoCompleteField: React.FC<AutoCompleteComponentProps> = ({
  items = [],
  value = null,
  onChange,
  onSearch,
  placeholder = 'พิมพ์เพื่อค้นหา...',
  label,
  required = false,
  disabled = false,
  className = '',
  debounceMs = 300
}) => {
  const [suggestions, setSuggestions] = useState<string[]>(items);

  const search = async (event: { query: string }) => {
    if (!onSearch) {
      // If no onSearch function, filter from items
      const filtered = event.query
        ? items.filter(item => item.toLowerCase().includes(event.query.toLowerCase()))
        : items;
      setSuggestions(filtered);
      return;
    }

    // ป้องกันการค้นหาถ้า query ว่าง
    if (!event.query || event.query.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await Promise.resolve(onSearch(event.query));
      setSuggestions(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    }
  };

  // Load initial data only once
  useEffect(() => {
    if (items.length > 0) {
      setSuggestions(items);
    }
  }, []); // Empty dependency array

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <AutoComplete
        value={value ?? ''}
        suggestions={suggestions}
        completeMethod={search}
        onChange={(e) => onChange?.(e.value || null)}
        placeholder={placeholder}
        disabled={disabled}
        inputClassName="w-full h-12 px-4 text-base"
        className="w-full"
      />
    </div>
  );
};

export default AutoCompleteField;