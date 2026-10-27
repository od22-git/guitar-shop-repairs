// Long-form text from messages/*.json (policies, About): blank lines separate paragraphs,
// and a block whose lines all start with "- " is a bulleted list.

type Props = {
  text: string;
  /** Two columns on wide screens, so a section's text fills the width. */
  columns?: boolean;
  className?: string;
};

export function Prose({ text, columns = false, className }: Props) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim().split("\n"));
  const layout = columns
    ? "gap-x-6 lg:columns-2 [&>*]:mb-4 [&>*:last-child]:mb-0 [&>ul]:break-inside-avoid"
    : "flex max-w-[65ch] flex-col gap-4";
  return (
    <div className={`${layout} ${className ?? ""}`}>
      {blocks.map((lines, i) =>
        lines.every((line) => line.startsWith("- ")) ? (
          <ul key={i} className="list-disc space-y-2 ps-5 marker:text-black">
            {lines.map((line) => (
              <li key={line}>{line.slice(2)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{lines.join(" ")}</p>
        ),
      )}
    </div>
  );
}
