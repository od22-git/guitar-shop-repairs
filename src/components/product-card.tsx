import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { localized, localizedAttrs } from "@/lib/localized";
import type { PublicProduct } from "@/lib/public-dto";

import { FillPhoto } from "./fill-photo";
import { PriceTag } from "./price-tag";

/** Shop grid cell widths, for the photo's `sizes`: two columns on phones, three from md. */
const cardSizes = "(min-width: 1152px) 280px, (min-width: 768px) 25vw, 46vw";

/**
 * One product in the shop grid: photo with its swing tag, title and condition, all one
 * link. The photo's alt is empty because the title already names the item.
 */
export async function ProductCard({ product, eager }: { product: PublicProduct; eager: boolean }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Condition")]);
  const title = localized(locale, product.titleEn, product.titleAr);
  const [photo] = product.images;
  const sold = product.status === "sold";

  return (
    <Link href={`/product/${product.slug}`} className="group grid content-start">
      <div className="relative col-start-1 row-start-1 aspect-[4/5] overflow-hidden rounded-sm bg-rosewood">
        {photo && (
          <FillPhoto
            src={photo.src}
            alt=""
            sizes={cardSizes}
            eager={eager}
            className={sold ? "opacity-70 grayscale" : ""}
          />
        )}
      </div>
      <h2
        className="row-start-2 mt-3 leading-snug font-bold text-pretty underline-offset-4 group-hover:text-gold group-hover:underline"
        {...localizedAttrs(title, locale)}
      >
        {title.text}
      </h2>
      <p className="row-start-3 mt-1 text-sm text-ink-subtle">{t(product.condition ?? "new")}</p>
      {/* After the title in the DOM, so the link reads title first; shown on the photo. */}
      <PriceTag
        product={product}
        className="z-10 col-start-1 row-start-1 mb-4 self-end justify-self-start"
      />
    </Link>
  );
}
