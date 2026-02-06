'use client';

import { useId, useMemo, useRef, useState, useEffect, type ChangeEvent, type CSSProperties } from 'react';
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
  dropdownSubLabel?: string; // shown below label
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
  /** A11y: dùng khi không có label liên kết được với trigger */
  ariaLabel?: string;
  /** A11y: trỏ tới id của label bên ngoài */
  ariaLabelledBy?: string;
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
  ariaLabel,
  ariaLabelledBy,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const reactId = useId();
  const listboxId = `dd-listbox-${reactId}`;

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
        setActiveIndex(-1);
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
    setActiveIndex(-1);
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
        (opt.dropdownMetaText || opt.dropdownCopyText || opt.dropdownTooltip || opt.dropdownSubLabel || '').toString()
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

  const selectedIndex = useMemo(() => {
    if (!value) return -1;
    return filteredOptions.findIndex((opt) => opt.value === value);
  }, [filteredOptions, value]);

  const clampIndex = (next: number) => {
    const max = filteredOptions.length - 1;
    if (max < 0) return -1;
    return Math.max(0, Math.min(max, next));
  };

  const scrollOptionIntoView = (index: number) => {
    const menuEl = menuRef.current;
    if (!menuEl) return;
    const el = menuEl.querySelector<HTMLElement>(`[data-dd-option-index="${index}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest' });
  };

  const resetMenuState = () => {
    setSearchTerm('');
    setMenuVars(null);
    setCopiedValue(null);
    setActiveIndex(-1);
  };

  const openMenu = () => {
    if (disabled) return;
    // Khi mở: ưu tiên highlight option đang chọn, fallback option đầu.
    const initial = selectedIndex >= 0 ? selectedIndex : (filteredOptions.length > 0 ? 0 : -1);
    setActiveIndex(initial);
    // Focus ô search nếu có, để nhập nhanh.
    if (searchable) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
    window.setTimeout(() => scrollOptionIntoView(initial), 0);
  };

  const closeMenu = () => {
    resetMenuState();
  };

  useEffect(() => {
    if (!isOpen) return;
    // Nếu options thay đổi (do search), giữ activeIndex trong range.
    setActiveIndex((prev) => clampIndex(prev < 0 ? (filteredOptions.length > 0 ? 0 : -1) : prev));
  }, [filteredOptions.length, isOpen]);

  const portalStyle: CSSProperties | undefined = menuVars
    ? ({
      ['--dd-top' as any]: `${menuVars.top}px`,
      ['--dd-left' as any]: `${menuVars.left}px`,
      ['--dd-width' as any]: `${menuVars.width}px`,
      ['--dd-max-height' as any]: `${menuVars.maxHeight}px`,
    } as CSSProperties)
    : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        openMenu();
      }
      return;
    }

    // isOpen = true
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      closeMenu();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = clampIndex((prev < 0 ? 0 : prev + 1));
        window.setTimeout(() => scrollOptionIntoView(next), 0);
        return next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = clampIndex((prev < 0 ? 0 : prev - 1));
        window.setTimeout(() => scrollOptionIntoView(next), 0);
        return next;
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filteredOptions[activeIndex];
      if (opt) handleSelect(opt);
      return;
    }
  };

  const menu = isOpen
    ? createPortal(
      <div
        ref={menuRef}
        className="admin-app-dropdown-menu admin-app-dropdown-menu-portal"
        style={portalStyle}
        role="listbox"
        id={listboxId}
        aria-label={ariaLabel ? `${ariaLabel} - danh sách` : undefined}
        onKeyDown={handleKeyDown}
      >
        {searchable && (
          <div className="admin-app-dropdown-search">
            <input
              type="text"
              className="admin-app-dropdown-search-input"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              autoFocus
              ref={searchInputRef}
              aria-label="Tìm kiếm"
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
            {filteredOptions.map((option, idx) => (
              <div
                key={option.value}
                className={`admin-app-dropdown-option ${value === option.value ? 'selected' : ''} ${activeIndex >= 0 && filteredOptions[activeIndex]?.value === option.value ? 'is-active' : ''}`}
                onClick={() => handleSelect(option)}
                title={option.dropdownTooltip}
                role="option"
                aria-selected={value === option.value}
                data-dd-option-index={idx}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <div className="admin-app-dropdown-option-content">
                  <span className="admin-app-dropdown-option-label">
                    {option.label}
                  </span>
                  {option.dropdownSubLabel && (
                    <span className="admin-app-dropdown-option-sublabel" style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                      {option.dropdownSubLabel}
                    </span>
                  )}
                </div>
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
          setIsOpen((v) => {
            const next = !v;
            if (next) openMenu();
            else closeMenu();
            return next;
          });
        }}
        disabled={disabled}
        title={triggerTitle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onKeyDown={handleKeyDown}
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

