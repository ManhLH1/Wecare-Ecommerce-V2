import React from 'react';
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';
import Header from './header';

interface ScrollableHeaderWrapperProps {
  cartItemsCount: number;
  onSearch: (term: string, type?: string) => void;
  isSearching?: boolean;
  onCartClick?: () => void;
  children: React.ReactNode;
}

const ScrollableHeaderWrapper: React.FC<ScrollableHeaderWrapperProps> = ({
  cartItemsCount,
  onSearch,
  isSearching = false,
  onCartClick,
  children
}) => {
  const isHeaderVisible = useHeaderVisibility();

  return (
    <>
      <Header
        cartItemsCount={cartItemsCount}
        onSearch={onSearch}
        isSearching={isSearching}
        onCartClick={onCartClick}
        isHeaderVisible={isHeaderVisible}
      />
      {children}
    </>
  );
};

export default ScrollableHeaderWrapper;

