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
 * the width, then the lead and its buttons next to a black-and-white photo. On phones the
 * photo comes before the lead, as on the home page.
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
          className={`relative col-span-4 md:order-last ${portrait ? "aspect-[4/5] md:col-span-5 md:col-start-8 md:aspect-[2/3]" : "aspect-[3/2] md:col-span-7 md:col-start-6"}`}
        >
          <StockPhoto
            photo={photo}
            alt={photoAlt}
            sizes="(min-width: 1600px) 880px, (min-width: 768px) 56vw, 100vw"
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
