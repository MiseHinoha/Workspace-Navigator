import { useEffect, useState } from 'react';
import { getBookmarkIconUrl } from '../utils/api';

interface SiteIconProps {
  url: string;
  icon?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export function SiteIcon({
  url,
  icon,
  alt = '',
  className = '',
  fallbackClassName = 'text-sm',
}: SiteIconProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url, icon]);

  if (!url || hasError) {
    return <span className={fallbackClassName}>🔗</span>;
  }

  return (
    <img
      src={getBookmarkIconUrl(url, icon)}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
