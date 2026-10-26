import { Fragment } from "react";

import { getTranslations } from "next-intl/server";

import {
  stockPhotos,
  unsplashHomeUrl,
  unsplashProfileUrl,
  type StockPhotoKey,
} from "@/config/stock-photos";

import { Bdi } from "./bdi";

const tones = {
  dark: {
    text: "text-ink-subtle",
    link: "underline decoration-gold underline-offset-4 hover:text-gold",
  },
  /** The M9a light pages. */
  light: {
    text: "text-grey-600",
    link: "underline decoration-blue underline-offset-4 hover:text-black",
  },
} as const;

/** "Photos by … on Unsplash": credits the photographers of the stock photos on a page. */
export async function PhotoCredits({
  photos,
  tone = "dark",
}: {
  photos: readonly StockPhotoKey[];
  tone?: keyof typeof tones;
}) {
  const t = await getTranslations("PhotoCredits");
  const { text, link: linkClass } = tones[tone];
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
    <p className={`text-sm ${text}`}>
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
