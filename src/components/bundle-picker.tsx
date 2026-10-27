"use client";

import { useState, type ReactNode } from "react";

import { Arrow, buttonClass } from "./ui/button";
import { OptionCard } from "./ui/field";
import { WhatsAppIcon } from "./whatsapp-icon";

export type PickerVariant = {
  id: number;
  /** The name, with an "Our pick" badge where it applies. */
  label: ReactNode;
  detail: ReactNode;
  /** <Price>, rendered on the server. */
  price: ReactNode;
  /** The WhatsApp order link for this variant, and with the add-on (null if it can't go with it). */
  href: string;
  withAddon: string | null;
};

type Props = {
  legend: string;
  variants: PickerVariant[];
  /** Chosen first: the featured variant, or the first. */
  defaultId: number;
  addon: {
    legend: string;
    label: ReactNode;
    detail: ReactNode;
    price: ReactNode;
  } | null;
  /** The order button's text. */
  cta: string;
};

/**
 * The bundle picker: one radio card per variant, an optional add-on, and the WhatsApp
 * order button, whose message names what's picked. Without JavaScript the button orders
 * the variant chosen first. All variants share the product's stock, so the page shows
 * one availability for all of them; the picker is shown only while it can be ordered.
 */
export function BundlePicker({ legend, variants, defaultId, addon, cta }: Props) {
  const [chosenId, setChosenId] = useState(defaultId);
  const [withAddon, setWithAddon] = useState(false);
  const chosen = variants.find((variant) => variant.id === chosenId) ?? variants[0];
  const addonFits = chosen.withAddon !== null;
  const href = withAddon && chosen.withAddon ? chosen.withAddon : chosen.href;

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-4 font-bold">{legend}</legend>
        <div className="flex flex-col gap-2">
          {variants.map((variant) => (
            <OptionCard
              key={variant.id}
              name="variant"
              value={variant.id}
              checked={variant.id === chosen.id}
              onChange={() => setChosenId(variant.id)}
              label={variant.label}
              detail={variant.detail}
              aside={variant.price}
            />
          ))}
        </div>
      </fieldset>
      {addon && (
        <fieldset>
          <legend className="mb-4 font-bold">{addon.legend}</legend>
          <OptionCard
            type="checkbox"
            name="addon"
            checked={withAddon && addonFits}
            disabled={!addonFits}
            onChange={(event) => setWithAddon(event.target.checked)}
            label={addon.label}
            detail={addon.detail}
            aside={addon.price}
            className="has-disabled:cursor-not-allowed has-disabled:opacity-50"
          />
        </fieldset>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-ask="order"
        className={buttonClass("primary", { block: true })}
      >
        <span className="inline-flex items-center gap-3">
          <WhatsAppIcon className="size-5" />
          {cta}
        </span>
        <Arrow />
      </a>
    </div>
  );
}
