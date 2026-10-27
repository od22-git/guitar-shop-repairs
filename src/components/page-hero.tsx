import type { ReactNode } from "react";

import { stockPhotos, type StockPhotoKey } from "@/config/stock-photos";

import { StockPhoto } from "./stock-photo";
import { Grid, Section } from "./ui/layout";
import { Heading, Lead } from "./ui/text";

type Props = {
  title: ReactNode;
  lead: ReactNode;
  /** Buttons under the lead. */
  actions?: ReactNode;
  photo: StockPhotoKey;
  photoAlt: string;
};

/**
 * The opening of an inner page (repairs, sell, about): the page's display heading across
 * the width, then the lead and its buttons next to a black-and-white photo. The photo starts
 * on the grid's 5th column (landscape) or 9th (portrait), the lines every page aligns to.
 * On phones the photo comes before the lead, as on the home page.
 */
export function PageHero({ title, lead, actions, photo, photoAlt }: Props) {
  const [w, h] = stockPhotos[photo].aspect;
  const portrait = h > w;

  return (
    <Section className="pt-10 md:pt-16">
      <Heading level="display" as="h1">
        {title}
      </Heading>
      <Grid className="mt-10 gap-y-8 md:mt-16">
        <div
          className={`relative col-span-4 md:order-last ${portrait ? "aspect-[4/5] md:col-span-4 md:col-start-9 md:aspect-[2/3]" : "aspect-[3/2] md:col-span-8 md:col-start-5"}`}
        >
          <StockPhoto
            photo={photo}
            alt={photoAlt}
            sizes={
              portrait
                ? "(min-width: 1600px) 480px, (min-width: 768px) 32vw, 100vw"
                : "(min-width: 1600px) 1000px, (min-width: 768px) 64vw, 100vw"
            }
            className="grayscale"
            eager
          />
        </div>
        <div className="col-span-4 flex flex-col justify-end md:col-span-4">
          <Lead>{lead}</Lead>
          {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </div>
      </Grid>
    </Section>
  );
}
