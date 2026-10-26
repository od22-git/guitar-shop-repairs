import { getLocale, getTranslations } from "next-intl/server";

import { brand } from "@/config/brand";
import { policies } from "@/config/policies";
import { Link } from "@/i18n/navigation";
import { shopWhatsAppUrl } from "@/lib/whatsapp/shop-link";

import { SocialLinks } from "./social-links";

const linkClass =
  "inline-flex min-h-11 items-center underline decoration-gold underline-offset-4 hover:text-gold";

const shopLinks = [
  ["/shop", "shop"],
  ["/repairs", "repairs"],
  ["/sell", "sell"],
  ["/faq", "faq"],
] as const;
const aboutLinks = [
  ["/about", "about"],
  ["/contact", "contact"],
] as const;

export async function SiteFooter() {
  const locale = await getLocale();
  const [t, tPolicies, whatsappUrl] = await Promise.all([
    getTranslations("Footer"),
    getTranslations("Policies"),
    shopWhatsAppUrl(locale),
  ]);

  return (
    <footer className="bg-rosewood">
      {/* The bottom padding keeps the floating WhatsApp button clear of the last line. */}
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-12 pb-28 sm:grid-cols-3 sm:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 lg:col-span-1">
          <p className="text-lg font-extrabold" translate="no">
            {brand.name[locale]}
          </p>
          <p className="mt-1 text-ink-subtle">{brand.tagline[locale]}</p>
          <p className="mt-4 max-w-[60ch] text-ink-subtle">
            {t("serviceArea", { location: brand.location[locale] })}
          </p>
          <SocialLinks linkClass={linkClass} className="mt-2" />
        </div>
        <div>
          <h2 className="font-bold text-gold">{t("linksHeading")}</h2>
          <ul className="mt-2">
            {shopLinks.map(([href, key]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gold">{t("contactHeading")}</h2>
          <ul className="mt-2">
            <li>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("whatsapp")}
              </a>
            </li>
            {aboutLinks.map(([href, key]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-gold">{t("policiesHeading")}</h2>
          <ul className="mt-2">
            {policies.map((policy) => (
              <li key={policy}>
                <Link href={`/policies/${policy}`} className={linkClass}>
                  {tPolicies(`${policy}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
