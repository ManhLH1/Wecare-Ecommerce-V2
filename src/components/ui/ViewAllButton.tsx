import React from 'react';
import Link from 'next/link';

interface ViewAllButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'gradient' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const ViewAllButton: React.FC<ViewAllButtonProps> = ({ 
  href, 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  'aria-label': ariaLabel
}) => {
  const baseClasses = "group inline-flex items-center font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 no-underline";
  
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  const variants = {
    primary: "text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md hover:shadow-lg border-0",
    secondary: "text-blue-600 hover:text-blue-700 bg-white border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md",
    outline: "text-gray-700 hover:text-gray-900 bg-transparent border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50",
    gradient: "text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-md hover:shadow-lg border-0",
    default: "text-blue-600 hover:text-blue-700 bg-white border border-blue-200 hover:border-blue-300 hover:shadow-md"
  };

  return (
    <Link
      href={href}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`}
      aria-label={ariaLabel}
    >
      <span className="mr-2">{children}</span>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
};

export default ViewAllButton; 