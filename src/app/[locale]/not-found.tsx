import { getTranslations } from "next-intl/server";

import { Arrow, buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Heading, Label, Lead } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <Label as="p" className="text-grey-600">
        {t("label")}
      </Label>
      <Heading level="display" as="h1" className="mt-6">
        {t("title")}
      </Heading>
      <Lead className="mt-8 text-grey-600">{t("body")}</Lead>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonClass("primary")}>
          {t("home")}
          <Arrow />
        </Link>
        <Link href="/shop" className={buttonClass("secondary")}>
          {t("shop")}
          <Arrow />
        </Link>
      </div>
    </Container>
  );
}
