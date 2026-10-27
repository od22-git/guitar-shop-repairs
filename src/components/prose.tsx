// Long-form text from messages/*.json (policies, About): blank lines separate paragraphs,
// and a block whose lines all start with "- " is a bulleted list.

type Props = { text: string; className?: string };

export function Prose({ text, className }: Props) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim().split("\n"));
  return (
    <div className={`flex max-w-[65ch] flex-col gap-4 ${className ?? ""}`}>
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
