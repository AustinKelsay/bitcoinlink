import Image, { StaticImageData } from 'next/image';
import { useState, KeyboardEvent } from 'react';

interface BaseImagePreviewProps {
  preview?: boolean;
  className?: string;
  alt: string;
}

interface StaticImageProps extends BaseImagePreviewProps {
  src: StaticImageData;
  width?: never;
  height?: never;
}

interface StringImageProps extends BaseImagePreviewProps {
  src: string;
  width: number;
  height: number;
}

type ImagePreviewProps = StaticImageProps | StringImageProps;

export function ImagePreview({
  src,
  preview,
  className,
  alt,
  ...props
}: ImagePreviewProps): React.ReactElement {
  const [fullscreen, setFullscreen] = useState(false);

  const handleToggle = (): void => {
    setFullscreen(!fullscreen);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
    if (e.key === 'Escape' && fullscreen) {
      setFullscreen(false);
    }
  };

  // Determine if we need width/height props (for string src)
  const imageProps = typeof src === 'string'
    ? { src, width: (props as StringImageProps).width, height: (props as StringImageProps).height }
    : { src };

  if (preview) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={fullscreen}
        aria-label={fullscreen ? 'Close fullscreen image' : 'Open fullscreen image'}
        className={
          fullscreen
            ? 'absolute inset-0 bg-black grid place-items-center z-10'
            : 'cursor-pointer'
        }
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        {fullscreen && (
          <i className="absolute top-2 right-2 pi pi-times text-white cursor-pointer"></i>
        )}
        <Image
          {...imageProps}
          alt={alt}
          className={
            fullscreen ? 'w-full h-auto md:h-[80vh] md:w-auto' : className
          }
        />
      </div>
    );
  }
  return (
    <div>
      <Image {...imageProps} alt={alt} className={className} />
    </div>
  );
}
