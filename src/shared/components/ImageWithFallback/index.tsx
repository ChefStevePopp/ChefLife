import React, { useState, useCallback } from 'react';
import { ImageOff } from 'lucide-react';

// =============================================================================
// IMAGE WITH FALLBACK
// =============================================================================
// Graceful image loading with fallback to placeholder when:
// - No image URL provided
// - Image fails to load
// - Image URL is invalid
// =============================================================================

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'rounded' | 'circle';
  showPlaceholderIcon?: boolean;
}

// Size presets
const SIZES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

// Shape presets
const SHAPES = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  circle: 'rounded-full',
};

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  size = 'md',
  shape = 'rounded',
  showPlaceholderIcon = true,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const sizeClass = SIZES[size];
  const shapeClass = SHAPES[shape];
  const baseClasses = `${sizeClass} ${shapeClass} overflow-hidden flex-shrink-0`;

  // No source or error - show placeholder
  if (!src || hasError) {
    return (
      <div 
        className={`${baseClasses} bg-gray-800 flex items-center justify-center ${fallbackClassName}`}
        title={alt}
      >
        {showPlaceholderIcon && (
          <ImageOff className="w-1/2 h-1/2 text-gray-600" />
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-gray-800 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
};

export default ImageWithFallback;
