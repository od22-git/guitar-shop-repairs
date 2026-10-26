import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

const linkClass =
  "inline-flex min-h-11 items-center underline decoration-gold underline-offset-4 hover:text-gold";

export async function SiteFooter() {
  const locale = await getLocale();
  const [t, whatsappUrl] = await Promise.all([getTranslations("Footer"), shopWhatsAppUrl(locale)]);

  return (
    <footer className="bg-rosewood">
      {/* The bottom padding keeps the floating WhatsApp button clear of the last line. */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 pb-28 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div>
          <p className="text-lg font-extrabold" translate="no">
            {brand.name[locale]}
          </p>
          <p className="mt-1 text-ink-subtle">{brand.tagline[locale]}</p>
          <p className="mt-4 max-w-[60ch] text-ink-subtle">
            {t("serviceArea", { location: brand.location[locale] })}
          </p>
        </div>
        <div>
          <h2 className="font-bold text-gold">{t("linksHeading")}</h2>
          <ul className="mt-2">
            <li>
              <Link href="/shop" className={linkClass}>
                {t("shop")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={linkClass}>
                {t("faq")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gold">{t("contactHeading")}</h2>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 ${linkClass}`}
          >
            {t("whatsapp")}
          </a>
        </div>
      </div>
    </footer>
  );
}
