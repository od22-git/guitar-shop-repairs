import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Ltr } from "@/components/bdi";
import { SocialLinks } from "@/components/social-links";
import { Arrow, buttonClass } from "@/components/ui/button";
import { Container, Grid, RuledColumn } from "@/components/ui/layout";
import { IntroText } from "@/components/page-hero";
import { Heading, Label } from "@/components/ui/text";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand, socialLinks } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// WhatsApp first, then a phone call, both to the number in Settings, and the social
// accounts once they exist. The workshop's address is never published: visits are by
// appointment, arranged on WhatsApp.

const linkClass =
  "inline-flex min-h-11 items-center font-medium underline decoration-blue decoration-2 underline-offset-4 hover:decoration-black";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Contact");
  return pageMetadata(locale, "/contact", {
    title: t("title"),
    description: t("description", { location: brand.location[locale] }),
  });
}

export default async function ContactPage() {
  const locale = await getLocale();
  const [t, tWhatsApp, settings, whatsappUrl] = await Promise.all([
    getTranslations("Contact"),
    getTranslations("WhatsApp"),
    getSettings(),
    shopWhatsAppUrl(locale),
  ]);
  const location = brand.location[locale];
  const phone = formatPhone(settings.whatsapp_number);
  const hasSocial = socialLinks().length > 0;

  return (
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <Heading level="display" as="h1">
        {t("title")}
      </Heading>
      <IntroText className="mt-8">{t("intro")}</IntroText>

      <Grid className="mt-16 gap-y-12 md:mt-24">
        <RuledColumn className="col-span-4 md:col-span-6">
          <section aria-labelledby="whatsapp-heading">
            <Heading level="headline" as="h2" id="whatsapp-heading">
              {t("whatsappHeading")}
            </Heading>
            <p className="mt-4 max-w-[45ch] text-lg">{t("whatsappBody")}</p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-8 ${buttonClass("primary", { block: true })} sm:w-auto`}
            >
              <span className="inline-flex items-center gap-3">
                <WhatsAppIcon className="size-5" />
                {tWhatsApp("cta")}
              </span>
              <Arrow />
            </a>
          </section>
        </RuledColumn>
        <RuledColumn className="col-span-4 md:col-span-6">
          <section aria-labelledby="call-heading">
            <Heading level="headline" as="h2" id="call-heading">
              {t("callHeading")}
            </Heading>
            <p className="mt-4 max-w-[45ch] text-lg">{t("callBody")}</p>
            <a
              href={`tel:${settings.whatsapp_number}`}
              className="mt-6 inline-flex min-h-11 items-center text-title font-extrabold font-stretch-semi-expanded tabular-nums underline decoration-blue decoration-2 underline-offset-[6px] hover:decoration-black"
            >
              <Ltr>{phone}</Ltr>
            </a>
          </section>
        </RuledColumn>
      </Grid>

      <Grid className="mt-16 gap-y-12 md:mt-24">
        <section aria-labelledby="visit-heading" className="col-span-4 md:col-span-6">
          <Label as="h2" id="visit-heading" className="text-grey-600">
            {t("visitHeading")}
          </Label>
          <p className="mt-4 max-w-[50ch] text-lg">{t("visitBody", { location })}</p>
        </section>
        <div className="col-span-4 flex flex-col gap-12 md:col-span-6">
          {hasSocial && (
            <section aria-labelledby="social-heading">
              <Label as="h2" id="social-heading" className="text-grey-600">
                {t("socialHeading")}
              </Label>
              <SocialLinks linkClass={linkClass} className="mt-2" />
            </section>
          )}
          <section aria-labelledby="more-heading">
            <Label as="h2" id="more-heading" className="text-grey-600">
              {t("moreHeading")}
            </Label>
            <ul className="mt-2">
              <li>
                <Link href="/repairs#book" className={linkClass}>
                  {t("bookRepair")}
                </Link>
              </li>
              <li>
                <Link href="/sell" className={linkClass}>
                  {t("sell")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </Grid>
    </Container>
  );
}
