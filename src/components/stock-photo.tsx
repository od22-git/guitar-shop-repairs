import Image from "next/image";

import { stockPhotoSrc, type StockPhotoKey } from "@/config/stock-photos";

type Props = {
  photo: StockPhotoKey;
  alt: string;
  /** How wide the photo shows, as the `sizes` attribute, so phones get the small file. */
  sizes: string;
  /** For the photo that is the largest thing in the first screen. */
  eager?: boolean;
  className?: string;
};

/**
 * An atmosphere photo that fills its parent, which sets the size and must be `relative`.
 * Never flipped for right-to-left: photos show as taken in both languages.
 */
export function StockPhoto({ photo, alt, sizes, eager = false, className = "" }: Props) {
  return (
    <Image
      src={stockPhotoSrc(photo)}
      alt={alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={`object-cover ${className}`}
    />
  );
}
