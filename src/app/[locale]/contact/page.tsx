import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Ltr } from "@/components/bdi";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// WhatsApp first, then a phone call, both to the number in Settings. The workshop's
// address is never published: visits are by appointment, arranged on WhatsApp.

const linkClass =
  "inline-flex min-h-11 items-center underline decoration-gold underline-offset-4 hover:text-gold";

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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6 md:pt-10">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl rtl:leading-[1.3] rtl:tracking-normal">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-[55ch] text-lg text-ink-subtle">{t("intro")}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="whatsapp-heading" className="rounded-sm bg-rosewood p-6 sm:p-8">
          <h2 id="whatsapp-heading" className="text-2xl font-extrabold text-gold">
            {t("whatsappHeading")}
          </h2>
          <p className="mt-2">{t("whatsappBody")}</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center gap-2.5 rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
          >
            <WhatsAppIcon className="size-5" />
            {tWhatsApp("cta")}
          </a>
        </section>
        <section aria-labelledby="call-heading" className="rounded-sm bg-rosewood p-6 sm:p-8">
          <h2 id="call-heading" className="text-2xl font-extrabold text-gold">
            {t("callHeading")}
          </h2>
          <p className="mt-2">{t("callBody")}</p>
          <a href={`tel:${settings.whatsapp_number}`} className={`mt-4 text-xl ${linkClass}`}>
            <Ltr>{phone}</Ltr>
          </a>
        </section>
      </div>

      <section aria-labelledby="visit-heading" className="mt-14 max-w-[65ch]">
        <h2 id="visit-heading" className="text-2xl font-extrabold text-gold">
          {t("visitHeading")}
        </h2>
        <p className="mt-2 text-ink-subtle">{t("visitBody", { location })}</p>
      </section>

      <section aria-labelledby="more-heading" className="mt-10">
        <h2 id="more-heading" className="text-2xl font-extrabold text-gold">
          {t("moreHeading")}
        </h2>
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
  );
}
