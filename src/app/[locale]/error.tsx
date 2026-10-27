"use client";

import { useErrorText } from "@/components/error-text";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Link } from "@/i18n/navigation";

// The 500 page inside the site's layout, with strings from the layout (ErrorTextProvider).
// A client component, so it styles the heading itself rather than using <Heading>.

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  const text = useErrorText();

  return (
    <Container className="pt-10 pb-20 md:pt-16 md:pb-section">
      <h1 className="text-headline font-black tracking-[-0.02em] text-balance font-stretch-semi-expanded rtl:leading-[1.3] rtl:tracking-normal">
        {text.title}
      </h1>
      <p className="mt-8 max-w-[48ch] text-lead text-pretty text-grey-600">{text.body}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
          {text.retry}
        </button>
        <Link href="/" className={buttonClass("secondary")}>
          {text.home}
        </Link>
      </div>
    </Container>
  );
}
