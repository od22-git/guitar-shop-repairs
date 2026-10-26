import { Fragment } from "react";

import { getTranslations } from "next-intl/server";

import {
  stockPhotos,
  unsplashHomeUrl,
  unsplashProfileUrl,
  type StockPhotoKey,
} from "@/config/stock-photos";

import { Bdi } from "./bdi";

const linkClass = "underline decoration-gold underline-offset-4 hover:text-gold";

/** "Photos by … on Unsplash": credits the photographers of the stock photos on a page. */
export async function PhotoCredits({ photos }: { photos: readonly StockPhotoKey[] }) {
  const t = await getTranslations("PhotoCredits");
  const authors = [...new Map(photos.map((key) => [stockPhotos[key].username, stockPhotos[key]]))];

  // A plain comma list: Arabic list formatting would glue "و" onto the Latin names.
  const names = authors.map(([username, { author }], i) => (
    <Fragment key={username}>
      {i > 0 && t("separator")}
      <a href={unsplashProfileUrl(username)} className={linkClass} translate="no">
        <Bdi>{author}</Bdi>
      </a>
    </Fragment>
  ));

  return (
    <p className="text-sm text-ink-subtle">
      {t.rich("line", {
        names: () => names,
        unsplash: (chunks) => (
          <a href={unsplashHomeUrl} className={linkClass} translate="no">
            <Bdi>{chunks}</Bdi>
          </a>
        ),
      })}
    </p>
  );
}
