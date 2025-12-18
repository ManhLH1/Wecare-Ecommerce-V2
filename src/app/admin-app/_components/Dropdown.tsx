'use client';

import { useState, useRef, useEffect, type ChangeEvent, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface DropdownOption {
  value: string;
  label: string;
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
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch?.(term);
  };

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

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
            <div className="admin-app-dropdown-loading">Đang tải...</div>
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
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

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

