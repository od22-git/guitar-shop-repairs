import { getLocale, getTranslations } from "next-intl/server";

import { ColourChart } from "@/components/colour-chart";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/config/brand";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

// A holding page until the real home page (M8): what the shop is, how to reach it now.
export default async function HomePage() {
  const locale = await getLocale();
  const [t, tWhatsApp, whatsappUrl] = await Promise.all([
    getTranslations("Home"),
    getTranslations("WhatsApp"),
    shopWhatsAppUrl(locale),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 md:grid-cols-[1.15fr_1fr] md:items-center md:py-20 lg:gap-20">
      <div>
        <h1 className="text-5xl leading-[1.02] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl rtl:text-4xl rtl:leading-[1.3] rtl:tracking-normal sm:rtl:text-5xl lg:rtl:text-6xl">
          {brand.tagline[locale]}
        </h1>
        <p className="mt-6 max-w-[60ch] text-lg text-ink-muted">{t("intro")}</p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex min-h-12 items-center gap-2.5 rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep"
        >
          <WhatsAppIcon className="size-5" />
          {tWhatsApp("cta")}
        </a>
      </div>
      <ColourChart />
    </div>
  );
}
