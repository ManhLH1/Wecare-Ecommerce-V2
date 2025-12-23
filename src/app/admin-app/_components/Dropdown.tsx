'use client';

import { useState, useRef, useEffect, useMemo, type ChangeEvent, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

// Helper function to remove Vietnamese diacritics (bỏ dấu)
function removeDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Helper function to normalize text for search (lowercase + remove diacritics)
function normalizeForSearch(str: string): string {
  return removeDiacritics(str.toLowerCase().trim());
}

// Fuzzy search: check if search term matches text (allows partial matches, no diacritics)
function fuzzyMatch(searchTerm: string, text: string): boolean {
  if (!searchTerm) return true;
  if (!text) return false;
  
  const normalizedSearch = normalizeForSearch(searchTerm);
  const normalizedText = normalizeForSearch(text);
  
  // Fast path: exact substring match (most common case)
  if (normalizedText.includes(normalizedSearch)) {
    return true;
  }
  
  // Fast path: if search term is longer than text, no match
  if (normalizedSearch.length > normalizedText.length) {
    return false;
  }
  
  // Fuzzy match: check if all characters in search term appear in order in text
  // This allows searching "nguyen" to match "Nguyễn" or "ng" to match "Nguyễn"
  let searchIndex = 0;
  const searchLen = normalizedSearch.length;
  const textLen = normalizedText.length;
  
  for (let i = 0; i < textLen && searchIndex < searchLen; i++) {
    if (normalizedText[i] === normalizedSearch[searchIndex]) {
      searchIndex++;
    }
  }
  
  return searchIndex === searchLen;
}

interface DropdownOption {
  value: string;
  label: string;
  dropdownTooltip?: string; // native title tooltip
  dropdownMetaText?: string; // shown on hover (e.g. customer code)
  dropdownCopyText?: string; // text copied when clicking copy button
  [key: string]: any;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string, option?: DropdownOption) => void;
  placeholder?: string;
  loading?: boolean;
  searchable?: boolean;
  onSearch?: (search: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  loading = false,
  searchable = false,
  onSearch,
  disabled = false,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuVars, setMenuVars] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const clearCopyStateTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (clearCopyStateTimerRef.current) {
        window.clearTimeout(clearCopyStateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = dropdownRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideTrigger && !insideMenu) {
        setIsOpen(false);
        setSearchTerm('');
        setMenuVars(null);
        setCopiedValue(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const computeMenuPosition = () => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const viewportW = window.innerWidth || 0;
    const viewportH = window.innerHeight || 0;
    const margin = 8;

    const desiredMaxHeight = 320;
    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;

    const maxHeight = Math.max(
      120,
      Math.min(desiredMaxHeight, openUp ? spaceAbove : spaceBelow)
    );

    const width = Math.min(rect.width, Math.max(0, viewportW - margin * 2));
    const left = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, viewportW - width - margin)
    );

    const top = openUp
      ? Math.max(margin, rect.top - maxHeight)
      : Math.min(viewportH - margin - maxHeight, rect.bottom);

    setMenuVars({ top, left, width, maxHeight });
  };

  useEffect(() => {
    if (!isOpen) return;

    // Initial position
    computeMenuPosition();

    let raf = 0;
    const onReposition = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => computeMenuPosition());
    };

    // Capture scroll events on any scrollable ancestor
    document.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);

    return () => {
      document.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
      cancelAnimationFrame(raf);
    };
  }, [isOpen]);

  const handleSelect = (option: DropdownOption) => {
    onChange?.(option.value, option);
    setIsOpen(false);
    setSearchTerm('');
    setMenuVars(null);
    setCopiedValue(null);
  };

  const copyToClipboard = async (text: string) => {
    const trimmed = (text || '').toString();
    if (!trimmed) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
        return true;
      }
    } catch {
      // fall back below
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = trimmed;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopy = async (e: React.MouseEvent, option: DropdownOption) => {
    e.preventDefault();
    e.stopPropagation();
    const text = option.dropdownCopyText || option.dropdownMetaText || '';
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedValue(option.value);
    if (clearCopyStateTimerRef.current) window.clearTimeout(clearCopyStateTimerRef.current);
    clearCopyStateTimerRef.current = window.setTimeout(() => setCopiedValue(null), 1200);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch?.(term);
  };

  // Memoize normalized options for better performance
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => ({
      ...opt,
      _normalizedLabel: normalizeForSearch(opt.label || ''),
      _normalizedMeta: normalizeForSearch(
        (opt.dropdownMetaText || opt.dropdownCopyText || opt.dropdownTooltip || '').toString()
      ),
    }));
  }, [options]);

  // Optimized fuzzy search with memoized normalized text
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) {
      return options;
    }

    const normalizedSearch = normalizeForSearch(searchTerm);
    
    // Fast path: if search term is empty after normalization, return all
    if (!normalizedSearch) {
      return options;
    }

    return normalizedOptions
      .filter((opt) => {
        // Check label
        if (fuzzyMatch(normalizedSearch, opt._normalizedLabel)) {
          return true;
        }
        // Check meta text (code, etc.)
        if (opt._normalizedMeta && fuzzyMatch(normalizedSearch, opt._normalizedMeta)) {
          return true;
        }
        return false;
      })
      .map(({ _normalizedLabel, _normalizedMeta, ...opt }) => opt); // Remove normalized fields from result
  }, [searchable, searchTerm, normalizedOptions, options]);

  const portalStyle: CSSProperties | undefined = menuVars
    ? ({
        ['--dd-top' as any]: `${menuVars.top}px`,
        ['--dd-left' as any]: `${menuVars.left}px`,
        ['--dd-width' as any]: `${menuVars.width}px`,
        ['--dd-max-height' as any]: `${menuVars.maxHeight}px`,
      } as CSSProperties)
    : undefined;

  const menu = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          className="admin-app-dropdown-menu admin-app-dropdown-menu-portal"
          style={portalStyle}
        >
          {searchable && (
            <div className="admin-app-dropdown-search">
              <input
                type="text"
                className="admin-app-dropdown-search-input"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
          )}

          {loading ? (
            <div className="admin-app-dropdown-loading">
              <div className="admin-app-spinner admin-app-spinner-small"></div>
              <span>Đang tải...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="admin-app-dropdown-empty">Không có dữ liệu</div>
          ) : (
            <div className="admin-app-dropdown-options">
              {filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`admin-app-dropdown-option ${
                    value === option.value ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                  title={option.dropdownTooltip}
                >
                  <span className="admin-app-dropdown-option-label">
                  {option.label}
                  </span>
                  {(option.dropdownMetaText || option.dropdownCopyText) && (
                    <span
                      className="admin-app-dropdown-option-meta"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      title={option.dropdownTooltip}
                    >
                      <span className="admin-app-dropdown-option-meta-text">
                        {option.dropdownMetaText || option.dropdownCopyText}
                      </span>
                      <button
                        type="button"
                        className="admin-app-dropdown-copy-btn"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleCopy(e, option)}
                        aria-label="Copy"
                        title={copiedValue === option.value ? 'Đã copy' : 'Copy'}
                      >
                        {copiedValue === option.value ? '✓' : '⧉'}
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  const triggerTitle =
    (selectedOption as any)?.dropdownTooltip ||
    ((selectedOption as any)?.dropdownMetaText
      ? `Mã KH: ${(selectedOption as any)?.dropdownMetaText}`
      : undefined);

  return (
    <div
      className={`admin-app-dropdown ${isOpen ? 'is-open' : ''} ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="admin-app-dropdown-trigger"
        ref={triggerRef}
        onClick={() => {
          if (disabled) return;
          setIsOpen((v) => !v);
        }}
        disabled={disabled}
        title={triggerTitle}
      >
        <span className="admin-app-dropdown-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="admin-app-dropdown-arrow">▼</span>
      </button>

      {menu}
    </div>
  );
}

