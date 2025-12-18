'use client';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  inline?: boolean;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  text,
  inline = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'admin-app-spinner-small',
    medium: 'admin-app-spinner-medium',
    large: 'admin-app-spinner-large',
  };

  const containerClass = inline ? 'admin-app-spinner-inline' : 'admin-app-spinner-container';

  return (
    <div className={containerClass}>
      <div className={`admin-app-spinner ${sizeClasses[size]}`}></div>
      {text && <span className="admin-app-spinner-text">{text}</span>}
    </div>
  );
}

