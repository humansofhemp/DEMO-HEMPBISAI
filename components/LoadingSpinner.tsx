
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: string; // e.g., "w-8 h-8"
  color?: string; // e.g., "text-blue-500"
  strokeWidth?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = "w-8 h-8", 
  color = "text-current", // Use current text color by default
  strokeWidth = 2
}) => {
  return (
    <Loader2
      className={`animate-spin ${size} ${color}`}
      strokeWidth={strokeWidth}
    />
  );
};

export default LoadingSpinner;