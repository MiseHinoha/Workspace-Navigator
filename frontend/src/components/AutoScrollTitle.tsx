import { useRef, useState, useEffect } from 'react';

interface AutoScrollTitleProps {
  title: string;
  className?: string;
}

export function AutoScrollTitle({ title, className = '' }: AutoScrollTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [translateX, setTranslateX] = useState(0);

  useEffect(() => {
    const checkSize = () => {
      if (!containerRef.current || !contentRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const contentWidth = contentRef.current.scrollWidth;
      const overflow = contentWidth - containerWidth;
      
      setNeedsScroll(overflow > 5);
      setTranslateX(overflow > 0 ? -overflow : 0);
    };

    // Check immediately
    checkSize();
    
    // Use ResizeObserver to watch container size changes
    const observer = new ResizeObserver(checkSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // Also check after a short delay in case fonts haven't loaded
    const timer = setTimeout(checkSize, 100);
    
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [title]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden whitespace-nowrap ${className}`}
      style={{ minWidth: 0 }}
    >
      <span
        ref={contentRef}
        className="inline-block whitespace-nowrap transition-transform duration-500 ease-out hover:duration-[3000ms] hover:ease-in-out"
        style={{
          ['--translate-x' as string]: `${translateX}px`,
        }}
        onMouseEnter={(e) => {
          if (needsScroll) {
            e.currentTarget.style.transform = `translateX(var(--translate-x))`;
            e.currentTarget.style.transitionDuration = '3000ms';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.transitionDuration = '500ms';
        }}
      >
        {title}
      </span>
    </div>
  );
}
