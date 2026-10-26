"use client";

import { secondaryButton } from "../../../../_components/form";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${secondaryButton} print:hidden`}
    >
      {label}
    </button>
  );
}
