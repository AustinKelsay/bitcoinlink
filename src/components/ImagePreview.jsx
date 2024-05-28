import Image from "next/image";
import { useState } from "react";

export function ImagePreview({ src, preview, className, alt }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (preview) {
    return (
      <div
        className={
          fullscreen ? "absolute inset-0 bg-black grid place-items-center" : ""
        }
        onClick={() => {
          setFullscreen(!fullscreen);
        }}
      >
        {fullscreen && (
          <i className="absolute top-2 right-2 pi pi-times text-white cursor-pointer"></i>
        )}
        <Image
          src={src}
          alt={alt}
          className={fullscreen ? "h-[80vh] w-auto" : className}
        />
      </div>
    );
  }
  return (
    <div>
      <Image src={src} alt={alt} className={className} />
    </div>
  );
}
