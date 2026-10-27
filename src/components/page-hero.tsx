import type { ReactNode } from "react";

import type { StockPhotoKey } from "@/config/stock-photos";

import { StockPhoto } from "./stock-photo";
import { Section } from "./ui/layout";
import { Heading, Lead } from "./ui/text";

// Photos sit under their text across the full width, never beside it (owner decision, M9b):
// side by side, the short text left an empty column next to the photo.

/** A lead paragraph with its buttons: one row on wide screens, lead at the start. */
export function IntroRow({ lead, actions }: { lead: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-end md:justify-between md:gap-12">
      <Lead wide>{lead}</Lead>
      {actions && <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{actions}</div>}
    </div>
  );
}

/** A black-and-white photo across the full width: 3:2 on phones, 21:9 on wide screens. */
export function WidePhoto({
  photo,
  alt,
  eager = false,
}: {
  photo: StockPhotoKey;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div className="relative mt-10 aspect-[3/2] md:mt-12 md:aspect-[21/9]">
      <StockPhoto
        photo={photo}
        alt={alt}
        sizes="(min-width: 1600px) 1504px, 100vw"
        className="grayscale"
        eager={eager}
      />
    </div>
  );
}

/**
 * The opening of an inner page (repairs, sell, about): the page's display heading, the lead
 * and its buttons in one row, then a photo across the full width.
 */
export function PageHero({
  title,
  lead,
  actions,
  photo,
  photoAlt,
}: {
  title: ReactNode;
  lead: ReactNode;
  /** Buttons beside the lead. */
  actions?: ReactNode;
  photo: StockPhotoKey;
  photoAlt: string;
}) {
  return (
    <Section className="pt-10 md:pt-16">
      <Heading level="display" as="h1">
        {title}
      </Heading>
      <IntroRow lead={lead} actions={actions} />
      <WidePhoto photo={photo} alt={photoAlt} eager />
    </Section>
  );
}

/**
 * A section's heading above its content: the heading at the start and an optional note
 * beside it at the end, lined up on their last lines.
 */
export function SectionIntro({
  id,
  heading,
  note,
}: {
  id: string;
  heading: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="mb-10 grid gap-x-6 gap-y-6 md:mb-14 md:grid-cols-2 md:items-end">
      <Heading level="headline" as="h2" id={id}>
        {heading}
      </Heading>
      {note && <p className="max-w-[48ch] text-lg text-grey-600">{note}</p>}
    </div>
  );
}
