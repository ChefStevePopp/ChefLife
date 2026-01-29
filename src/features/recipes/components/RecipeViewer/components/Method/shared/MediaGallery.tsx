/**
 * MediaGallery - Image/Video gallery with lightbox
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from 'lucide-react';
import type { RecipeMedia } from '@/features/recipes/types/recipe';

interface MediaGalleryProps {
  media: RecipeMedia[];
  size?: 'normal' | 'large';
  layout?: 'grid' | 'inline';
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ 
  media, 
  size = 'normal', 
  layout = 'grid' 
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const images = media.filter(m => m.type === 'image');
  const videos = media.filter(m => m.type === 'video' || m.type === 'external-video');

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const thumbnailSize = size === 'large' ? 'w-24 h-24 sm:w-32 sm:h-32' : 'w-16 h-16 sm:w-20 sm:h-20';
  const gridCols = size === 'large' ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-4 sm:grid-cols-5';

  return (
    <>
      {images.length > 0 && (
        <div className={layout === 'inline' ? '' : 'mt-4'}>
          {layout === 'grid' && (
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Photos ({images.length})
              </span>
            </div>
          )}
          <div className={layout === 'inline' ? 'flex gap-2' : `grid ${gridCols} gap-2`}>
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => openLightbox(idx)}
                className={`${layout === 'inline' ? 'w-20 h-20 sm:w-24 sm:h-24' : thumbnailSize} rounded-lg overflow-hidden bg-gray-800 border border-gray-700/50 hover:border-amber-500/50 transition-all group relative flex-shrink-0`}
              >
                <img 
                  src={img.url} 
                  alt={img.title || `Step image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-4 space-y-3">
          {videos.map((vid) => (
            <div key={vid.id} className="rounded-lg overflow-hidden bg-gray-900 border border-gray-700/50">
              {vid.type === 'external-video' ? (
                <div className="aspect-video">
                  <iframe
                    src={vid.url}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video src={vid.url} className="w-full aspect-video object-cover" controls preload="metadata" />
              )}
              {vid.title && (
                <div className="px-3 py-2 border-t border-gray-700/50">
                  <p className="text-sm text-gray-400">{vid.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + images.length) % images.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % images.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          
          <div className="max-w-5xl max-h-[85vh] px-4" onClick={e => e.stopPropagation()}>
            <img 
              src={images[lightboxIndex].url} 
              alt={images[lightboxIndex].title || 'Step image'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {images[lightboxIndex].title && (
              <p className="text-center text-gray-300 mt-3">{images[lightboxIndex].title}</p>
            )}
            <p className="text-center text-gray-500 text-sm mt-1">
              {lightboxIndex + 1} of {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaGallery;
