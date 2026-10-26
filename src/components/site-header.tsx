import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { LocaleSwitch } from "./locale-switch";
import { SiteNav } from "./site-nav";
import { Container } from "./ui/layout";
import { Wordmark } from "./wordmark";

// The wordmark, the page links and the language switch on a white bar closed by a black
// rule. Phones fold the links behind a Menu button.
export async function SiteHeader() {
  const [t, tNav] = await Promise.all([getTranslations("LocaleSwitch"), getTranslations("Nav")]);

  return (
    <header className="relative z-30 border-b border-black bg-white">
      <Container className="flex min-h-16 items-center gap-x-8 md:min-h-18">
        <Link href="/" className="-my-2 inline-flex min-h-11 shrink-0 items-center py-2">
          <Wordmark className="text-[1.0625rem] md:text-xl" />
        </Link>
        <SiteNav
          label={tNav("label")}
          menu={tNav("menu")}
          links={[
            { href: "/shop", label: tNav("shop") },
            { href: "/repairs", label: tNav("repairs") },
            { href: "/sell", label: tNav("sell") },
            { href: "/about", label: tNav("about") },
            { href: "/contact", label: tNav("contact"), end: true },
          ]}
          localeSwitch={<LocaleSwitch label={t("other")} />}
        />
      </Container>
    </header>
  );
}
