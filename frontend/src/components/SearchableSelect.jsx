import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'اختر من القائمة...',
  searchPlaceholder = 'اكتب للبحث...',
  emptyMessage = 'لا توجد نتائج مطابقة للبحث',
  disabled = false,
  clearable = true,
  icon: TriggerIcon = null,
  className = '',
  dropdownClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Handle keyboard escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Selected Option Object
  const selectedOption = useMemo(() => {
    if (value === '' || value === null || value === undefined) return null;
    return options.find(opt => String(opt.value) === String(value)) || null;
  }, [options, value]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.trim().toLowerCase();
    return options.filter(opt => {
      const labelMatch = String(opt.label || '').toLowerCase().includes(term);
      const sublabelMatch = opt.sublabel ? String(opt.sublabel).toLowerCase().includes(term) : false;
      const searchExtraMatch = opt.searchExtra ? String(opt.searchExtra).toLowerCase().includes(term) : false;
      return labelMatch || sublabelMatch || searchExtraMatch;
    });
  }, [options, searchTerm]);

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className={`relative font-cairo ${className}`} dir="rtl">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full p-3 bg-surface border rounded-xl text-sm flex items-center justify-between gap-2.5 transition-all text-right ${
          isOpen 
            ? 'border-primary ring-2 ring-primary/20 shadow-sm' 
            : 'border-border hover:border-primary/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-surface/50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
          {TriggerIcon && (
            <TriggerIcon className="w-4 h-4 text-primary shrink-0" />
          )}
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-text-main truncate">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-xs text-text-muted truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-text-muted font-medium truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-text-muted">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e); }}
              className="p-1 hover:text-text-main rounded-md hover:bg-surface-hover transition-colors"
              title="إلغاء التحديد"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className={`absolute z-50 top-full mt-1.5 right-0 left-0 bg-surface-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn ${dropdownClassName}`}>
          {/* Search Box */}
          <div className="p-2.5 border-b border-border bg-surface/40">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-3 pr-9 py-2 bg-surface border border-border rounded-xl text-xs font-bold text-text-main focus:outline-none focus:border-primary placeholder:text-text-muted/70"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1 text-xs font-semibold">
            {/* Clear / Empty Option */}
            {clearable && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3 py-2 rounded-xl text-right transition-colors flex items-center justify-between ${
                  !value ? 'bg-primary/10 text-primary font-bold' : 'text-text-muted hover:bg-surface hover:text-text-main'
                }`}
              >
                <span>-- بدون تحديد --</span>
                {!value && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-text-muted">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const ItemIcon = opt.icon;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-right transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'text-text-main hover:bg-surface hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      {ItemIcon && (
                        <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-primary'}`} />
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate leading-tight">{opt.label}</span>
                        {opt.sublabel && (
                          <span className={`text-[11px] truncate leading-tight mt-0.5 ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {opt.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-surface-card border border-border text-text-muted'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
