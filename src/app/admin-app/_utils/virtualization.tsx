// Virtualization utilities for rendering large lists efficiently
// Only renders visible items to improve performance

interface VirtualItem {
  index: number;
  height: number;
  data: any;
}

interface VirtualConfig {
  itemHeight: number;        // Fixed height for each item
  containerHeight: number;   // Height of scrollable container
  overscan?: number;         // Extra items to render outside viewport
}

export class VirtualList {
  private config: VirtualConfig;
  private scrollTop = 0;
  private totalItems = 0;

  constructor(config: VirtualConfig) {
    this.config = {
      overscan: 5,
      ...config
    };
  }

  setTotalItems(count: number): void {
    this.totalItems = count;
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleRange(): { start: number; end: number } {
    const { itemHeight, containerHeight, overscan = 5 } = this.config;

    const start = Math.max(0, Math.floor(this.scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(this.totalItems - 1, start + visibleCount + (overscan * 2));

    return { start, end };
  }

  getItemOffset(index: number): number {
    return index * this.config.itemHeight;
  }

  getTotalHeight(): number {
    return this.totalItems * this.config.itemHeight;
  }

  // Get items that should be rendered
  getVisibleItems<T>(items: T[]): Array<{ index: number; item: T; offset: number }> {
    const { start, end } = this.getVisibleRange();

    return items.slice(start, end + 1).map((item, i) => ({
      index: start + i,
      item,
      offset: this.getItemOffset(start + i)
    }));
  }
}

// React hook for virtualization
import { useState, useEffect, useCallback, useRef } from 'react';

export function useVirtualList<T>(
  items: T[],
  config: VirtualConfig
) {
  const virtualListRef = useRef(new VirtualList(config));
  const [visibleItems, setVisibleItems] = useState<Array<{ index: number; item: T; offset: number }>>([]);

  const virtualList = virtualListRef.current;

  useEffect(() => {
    virtualList.setTotalItems(items.length);
    updateVisibleItems();
  }, [items.length]);

  const updateVisibleItems = useCallback(() => {
    const newVisibleItems = virtualList.getVisibleItems(items);
    setVisibleItems(newVisibleItems);
  }, [items, virtualList]);

  const handleScroll = useCallback((scrollTop: number) => {
    virtualList.setScrollTop(scrollTop);
    updateVisibleItems();
  }, [virtualList, updateVisibleItems]);

  return {
    visibleItems,
    totalHeight: virtualList.getTotalHeight(),
    handleScroll,
    virtualList
  };
}

// Optimized dropdown with virtualization
export function VirtualizedDropdown({
  options,
  value,
  onChange,
  placeholder,
  itemHeight = 40,
  maxHeight = 200
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  itemHeight?: number;
  maxHeight?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { visibleItems, totalHeight, handleScroll } = useVirtualList(
    filteredOptions,
    {
      itemHeight,
      containerHeight: maxHeight,
      overscan: 3
    }
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border rounded-md text-left bg-white"
      >
        {selectedOption?.label || placeholder}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg">
          {/* Search input */}
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-b"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Virtualized list */}
          <div
            style={{ height: maxHeight, overflow: 'auto' }}
            onScroll={(e) => handleScroll(e.currentTarget.scrollTop)}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              {visibleItems.map(({ index, item, offset }) => (
                <div
                  key={item.value}
                  style={{
                    position: 'absolute',
                    top: offset,
                    height: itemHeight,
                    width: '100%'
                  }}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => {
                    onChange(item.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
