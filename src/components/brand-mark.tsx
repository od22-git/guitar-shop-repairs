/** Three finish chips side by side: the placeholder logo until the owner has one. */
export function BrandMark() {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      <span className="h-6 w-2.5 rounded-[1px] bg-fiesta" />
      <span className="h-6 w-2.5 rounded-[1px] bg-gold" />
      <span className="h-6 w-2.5 rounded-[1px] bg-ink" />
    </span>
  );
}
