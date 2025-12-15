'use client';

import { useState, useRef, useEffect } from 'react';

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

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: DropdownOption) => {
    onChange?.(option.value, option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    onSearch?.(term);
  };

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  return (
    <div className={`admin-app-dropdown ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="admin-app-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="admin-app-dropdown-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="admin-app-dropdown-arrow">▼</span>
      </button>

      {isOpen && (
        <div className="admin-app-dropdown-menu">
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
        </div>
      )}
    </div>
  );
}

