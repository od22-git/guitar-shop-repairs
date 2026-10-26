import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance rtl:tracking-normal">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg text-ink-muted">{t("body")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center font-semibold underline decoration-fiesta decoration-2 underline-offset-4 hover:text-fiesta-deep"
      >
        {t("home")}
      </Link>
    </div>
  );
}
