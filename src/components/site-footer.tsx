import type { ReactNode } from "react";

import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { policies } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

import { SocialLinks } from "./social-links";
import { Container, Grid } from "./ui/layout";
import { Label } from "./ui/text";
import { Wordmark } from "./wordmark";

// The black band that closes every page: three columns on the thirds of the grid, like the
// pages above (shop; help and the policies; where we work), then the wordmark across the
// full width.

const linkClass =
  "inline-flex min-h-11 items-center underline-offset-4 decoration-2 hover:underline";

const shopLinks = [
  ["/shop", "shop"],
  ["/repairs", "repairs"],
  ["/sell", "sell"],
] as const;
const helpLinks = [
  ["/faq", "faq"],
  ["/about", "about"],
  ["/contact", "contact"],
] as const;

function Column({
  heading,
  span = "col-span-2",
  children,
}: {
  heading: string;
  /** Columns on phones, out of 4. */
  span?: "col-span-2" | "col-span-4";
  children: ReactNode;
}) {
  return (
    <div className={`${span} md:col-span-4`}>
      <Label as="h2" className="text-grey-400">
        {heading}
      </Label>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export async function SiteFooter() {
  const locale = await getLocale();
  const [t, tPolicies, whatsappUrl] = await Promise.all([
    getTranslations("Footer"),
    getTranslations("Policies"),
    shopWhatsAppUrl(locale),
  ]);

  return (
    <footer className="bg-black text-white">
      <Container className="pt-16 md:pt-24">
        <Grid className="gap-y-12">
          <Column heading={t("shopHeading")}>
            <ul>
              {shopLinks.map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>
          <Column heading={t("helpHeading")}>
            <ul>
              {helpLinks.map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {t(key)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {t("whatsapp")}
                </a>
              </li>
            </ul>
            <Label as="h2" className="mt-10 text-grey-400">
              {t("policiesHeading")}
            </Label>
            <ul className="mt-4">
              {policies.map((policy) => (
                <li key={policy}>
                  <Link href={`/policies/${policy}`} className={linkClass}>
                    {tPolicies(`${policy}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>
          <Column heading={t("whereHeading")} span="col-span-4">
            <p className="max-w-[34ch] pt-2.5">
              {t("serviceArea", { location: brand.location[locale] })}
            </p>
            <p className="mt-4 text-grey-400">{brand.tagline[locale]}</p>
            <SocialLinks linkClass={linkClass} className="mt-2" />
          </Column>
        </Grid>
        {/* The wordmark spans the column: its width is about 11.3 times its font size, so
            8.7% of the container's width. The bottom padding keeps the floating WhatsApp
            button clear of it. */}
        <div className="@container pt-20 pb-24 md:pt-32 md:pb-28">
          <Wordmark className="block text-[8.7cqi]" />
        </div>
      </Container>
    </footer>
  );
}
