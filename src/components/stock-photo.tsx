import { stockPhotoSrc, type StockPhotoKey } from "@/config/stock-photos";

import { FillPhoto } from "./fill-photo";

type Props = {
  photo: StockPhotoKey;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
};

/** An atmosphere photo that fills its parent (see FillPhoto). */
export function StockPhoto({ photo, ...props }: Props) {
  return <FillPhoto src={stockPhotoSrc(photo)} {...props} />;
}
