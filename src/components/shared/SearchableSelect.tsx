import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

interface DropdownPos {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

const DROPDOWN_MAX_H = 350;

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
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < DROPDOWN_MAX_H && spaceAbove > spaceBelow;
    setPos({
      top: openUp ? rect.top + window.scrollY - DROPDOWN_MAX_H - 4 : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
      openUp,
    });
  }, []);

  const open = () => {
    calcPosition();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSearch('');
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close and recalc on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = () => close();
    const onResize = () => calcPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, calcPosition]);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt.value === value);

  const dropdown = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: pos.openUp ? -8 : 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.openUp ? -8 : 8, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
            maxHeight: DROPDOWN_MAX_H,
          }}
          className="bg-white border border-gray-200/80 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Search bar */}
          <div className="relative p-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type to filter..."
              autoFocus
              className="w-full bg-white border border-gray-200/80 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-gray-900 outline-none transition-all focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="overflow-y-auto p-2 space-y-1 scrollbar-thin" style={{ maxHeight: DROPDOWN_MAX_H - 64 }}>
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                No matches found
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      onChange(opt.value);
                      close();
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
                        {opt.label}
                      </span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5 truncate">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        className={cn(
          "w-full bg-gray-50 border border-gray-150 rounded-2xl pl-12 pr-10 py-4 text-left font-bold text-gray-900 shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between",
          !value && "text-gray-400 font-medium",
          isOpen && "border-indigo-400 ring-2 ring-indigo-500/20"
        )}
      >
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
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
};

export default SearchableSelect;
