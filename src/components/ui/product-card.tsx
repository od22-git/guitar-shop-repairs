import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { localizedAttrs, type Localized } from "@/lib/localized";

import { FillPhoto } from "../fill-photo";

/** Grid cell widths, for the photo's `sizes`: two columns on phones, four on wide screens. */
const cardSizes = "(min-width: 1600px) 370px, (min-width: 768px) 24vw, 46vw";

type Props = {
  href: string;
  title: Localized;
  locale: Locale;
  /** Stored photo path (FillPhoto), or none for the grey placeholder. */
  photo?: string | null;
  /** One line under the title: the condition of a used guitar, what's in a bundle. */
  detail?: ReactNode;
  /** The price (<Price>), or a state that replaces it, such as "Sold out". */
  price: ReactNode;
  /** A <Badge> at the photo's top inline-start corner. */
  badge?: ReactNode;
  /** Sold items: greyed photo. */
  muted?: boolean;
  eager?: boolean;
};

/**
 * A product in a grid: a big 4:5 photo on grey, then title, detail and price, all one link.
 * The photo's alt is empty because the title names the item; the title comes first in the
 * DOM so the link reads title, detail, price.
 */
export function ProductCard({
  href,
  title,
  locale,
  photo,
  detail,
  price,
  badge,
  muted,
  eager,
}: Props) {
  return (
    <Link href={href} className="group grid grid-cols-1 content-start">
      <div className="relative col-start-1 row-start-1 aspect-[4/5] overflow-hidden bg-grey-100">
        {photo && (
          <FillPhoto
            src={photo}
            alt=""
            sizes={cardSizes}
            eager={eager}
            className={`transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none ${muted ? "opacity-60 grayscale" : ""}`}
          />
        )}
      </div>
      <h3
        className="col-start-1 row-start-2 mt-4 text-lg leading-snug font-bold text-pretty underline-offset-4 group-hover:underline group-hover:decoration-blue group-hover:decoration-2"
        {...localizedAttrs(title, locale)}
      >
        {title.text}
      </h3>
      {detail && <p className="col-start-1 row-start-3 mt-1 text-grey-600">{detail}</p>}
      <div className="col-start-1 row-start-4 mt-2">{price}</div>
      {badge && (
        <div className="relative z-10 col-start-1 row-start-1 m-3 self-start justify-self-start">
          {badge}
        </div>
      )}
    </Link>
  );
}
