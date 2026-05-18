import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select Option',
  icon,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search input
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    (option.subLabel && option.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Selection Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-gray-50 border border-gray-150 rounded-2xl pl-12 pr-10 py-4 text-left font-bold text-gray-900 shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between",
          !value && "text-gray-400 font-medium"
        )}
      >
        {/* Leading Custom Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {icon}
          </div>
        )}

        <div className="truncate flex flex-col">
          <span className="text-sm font-bold text-gray-900 leading-tight">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subLabel && (
            <span className="text-[10px] font-medium text-gray-400 leading-none mt-0.5">
              {selectedOption.subLabel}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Dropdown Options List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[999] w-full bg-white border border-gray-200/80 rounded-[2rem] shadow-2xl overflow-hidden mt-1 max-h-[350px] flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="relative p-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to filter..."
                className="w-full bg-white border border-gray-200/80 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-gray-900 outline-none transition-all focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Scrollable list */}
            <div className="overflow-y-auto max-h-[260px] p-2 space-y-1 scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                  No matches found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group",
                        isSelected 
                          ? "bg-indigo-50 text-indigo-950 font-black" 
                          : "hover:bg-gray-50 text-gray-700 hover:text-gray-950"
                      )}
                    >
                      <div className="flex flex-col truncate pr-4">
                        <span className={cn(
                          "text-xs font-bold truncate transition-colors",
                          isSelected ? "text-indigo-900" : "text-gray-900 group-hover:text-indigo-600"
                        )}>
                          {option.label}
                        </span>
                        {option.subLabel && (
                          <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5 truncate">
                            {option.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchableSelect;
