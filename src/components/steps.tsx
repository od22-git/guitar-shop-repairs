import { RuledColumn } from "./ui/layout";
import { Label } from "./ui/text";

/** A numbered process across the full width: four columns on wide screens, two on tablets. */
export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid grid-cols-4 gap-x-4 gap-y-12 md:grid-cols-12 md:gap-x-6">
      {steps.map((step, index) => (
        <li key={step.title} className="col-span-4 sm:col-span-2 md:col-span-3">
          <RuledColumn>
            {/* The list is numbered already; this is the visible number. */}
            <Label as="p" aria-hidden="true" className="tabular-nums">
              {`0${index + 1}`}
            </Label>
            <h3 className="mt-6 text-xl font-extrabold font-stretch-semi-expanded">{step.title}</h3>
            <p className="mt-2 max-w-[40ch] text-grey-600">{step.body}</p>
          </RuledColumn>
        </li>
      ))}
    </ol>
  );
}
