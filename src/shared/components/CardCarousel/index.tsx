import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  Children,
  ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// =============================================================================
// CARD CAROUSEL - Zero-dependency carousel component
// =============================================================================
// Uses native CSS scroll-snap for buttery smooth touch/swipe support
// IntersectionObserver for active slide tracking
// Works great on desktop (arrows, keyboard) and tablet (swipe)
// =============================================================================

export interface CardCarouselProps {
  children: ReactNode;
  /** Show dot indicators below carousel */
  showDots?: boolean;
  /** Show arrow navigation buttons */
  showArrows?: boolean;
  /** Enable keyboard navigation (left/right arrows) */
  keyboardNav?: boolean;
  /** Gap between cards in pixels */
  gap?: number;
  /** Cards visible per view at different breakpoints */
  cardsPerView?: {
    mobile?: number;   // < 640px
    tablet?: number;   // 640px - 1024px
    desktop?: number;  // > 1024px
  };
  /** Additional class for the container */
  className?: string;
  /** Callback when active slide changes */
  onSlideChange?: (index: number) => void;
  /** Optional title above carousel */
  title?: string;
  /** Auto-play interval in ms (0 = disabled) */
  autoPlay?: number;
  /** Pause auto-play on hover */
  pauseOnHover?: boolean;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  children,
  showDots = true,
  showArrows = true,
  keyboardNav = true,
  gap = 16,
  cardsPerView = { mobile: 1, tablet: 2, desktop: 1 },
  className = "",
  onSlideChange,
  title,
  autoPlay = 0,
  pauseOnHover = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const childArray = Children.toArray(children);
  const totalSlides = childArray.length;

  // Determine current cards per view based on window width
  const [currentCardsPerView, setCurrentCardsPerView] = useState(1);

  useEffect(() => {
    const updateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCurrentCardsPerView(cardsPerView.mobile || 1);
      } else if (width < 1024) {
        setCurrentCardsPerView(cardsPerView.tablet || 2);
      } else {
        setCurrentCardsPerView(cardsPerView.desktop || 1);
      }
    };

    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, [cardsPerView]);

  // Calculate total "pages" based on cards per view
  const totalPages = Math.ceil(totalSlides / currentCardsPerView);

  // Scroll to specific slide
  const scrollToSlide = useCallback(
    (index: number) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const cardWidth = container.scrollWidth / totalSlides;
      const targetScroll = index * currentCardsPerView * cardWidth;
      container.scrollTo({ left: targetScroll, behavior: "smooth" });
    },
    [totalSlides, currentCardsPerView]
  );

  // Navigate to next/prev
  const goToNext = useCallback(() => {
    const nextIndex = (activeIndex + 1) % totalPages;
    scrollToSlide(nextIndex);
  }, [activeIndex, totalPages, scrollToSlide]);

  const goToPrev = useCallback(() => {
    const prevIndex = (activeIndex - 1 + totalPages) % totalPages;
    scrollToSlide(prevIndex);
  }, [activeIndex, totalPages, scrollToSlide]);

  // Track scroll position to update active index
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.scrollWidth / totalSlides;
      const pageWidth = cardWidth * currentCardsPerView;
      const newIndex = Math.round(scrollLeft / pageWidth);
      
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < totalPages) {
        setActiveIndex(newIndex);
        onSlideChange?.(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, totalSlides, totalPages, currentCardsPerView, onSlideChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!keyboardNav) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if carousel or its children are focused
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardNav, goToNext, goToPrev]);

  // Auto-play
  useEffect(() => {
    if (autoPlay <= 0 || (pauseOnHover && isHovered)) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlay);

    return () => clearInterval(interval);
  }, [autoPlay, pauseOnHover, isHovered, goToNext]);

  // Calculate card width percentage
  const cardWidthPercent = 100 / currentCardsPerView;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label={title || "Carousel"}
      aria-roledescription="carousel"
    >
      {/* Header with title and arrows */}
      {(title || showArrows) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          )}
          {showArrows && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="w-8 h-8 rounded-lg bg-gray-700/50 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNext}
                className="w-8 h-8 rounded-lg bg-gray-700/50 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable container with snap */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
        style={{
          gap: `${gap}px`,
          scrollPaddingLeft: 0,
          scrollPaddingRight: 0,
        }}
      >
        {childArray.map((child, index) => (
          <div
            key={index}
            className="flex-shrink-0 snap-start"
            style={{
              width: `calc(${cardWidthPercent}% - ${(gap * (currentCardsPerView - 1)) / currentCardsPerView}px)`,
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${totalSlides}`}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {showDots && totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-4"
          role="tablist"
          aria-label="Carousel navigation"
        >
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`transition-all duration-200 rounded-full ${
                index === activeIndex
                  ? "w-6 h-2 bg-primary-500"
                  : "w-2 h-2 bg-gray-600 hover:bg-gray-500"
              }`}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CAROUSEL CARD - Optional styled card wrapper for consistent look
// =============================================================================

export interface CarouselCardProps {
  children: ReactNode;
  /** Card title */
  title?: string;
  /** Icon component to show before title */
  icon?: ReactNode;
  /** Additional actions in header */
  headerActions?: ReactNode;
  /** Fill available height */
  fillHeight?: boolean;
  /** Additional class */
  className?: string;
  /** Click handler for the whole card */
  onClick?: () => void;
}

export const CarouselCard: React.FC<CarouselCardProps> = ({
  children,
  title,
  icon,
  headerActions,
  fillHeight = true,
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-xl overflow-hidden ${
        fillHeight ? "h-full" : ""
      } ${onClick ? "cursor-pointer hover:border-gray-600 transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {icon && <span className="text-primary-400">{icon}</span>}
            {title && (
              <h4 className="text-sm font-medium text-white">{title}</h4>
            )}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className={`${title || headerActions ? "" : ""}`}>{children}</div>
    </div>
  );
};

export default CardCarousel;
