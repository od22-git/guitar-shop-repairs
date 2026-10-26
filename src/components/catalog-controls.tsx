"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

export type FilterOption = { value: string; label: string; translate?: boolean };

export type FilterGroup = {
  /** URL parameter name. */
  name: string;
  legend: string;
  options: FilterOption[];
  selected: string[];
};

type Props = {
  /** The page's own path, where the form submits without JavaScript. */
  action: string;
  /** The query the server rendered, as sorted search params, to spot back/forward and links. */
  queryKey: string;
  groups: FilterGroup[];
  availableOnly: { name: string; label: string; checked: boolean };
  price: {
    legend: string;
    min: { name: string; label: string; value: string };
    max: { name: string; label: string; value: string };
    anyLabel: string;
    options: FilterOption[];
  };
  sort: { name: string; label: string; value: string; options: FilterOption[] };
  labels: { heading: string; toggle: string; apply: string };
  resultCount: string;
  /** The results, rendered on the server. */
  children: ReactNode;
};

const noop = () => () => {};

/** The form's values as sorted search params, leaving out empty ones (defaults). */
function formQuery(form: HTMLFormElement): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string" && value !== "") params.append(name, value);
  }
  params.sort();
  return params;
}

/** True when a field no longer shows the value the page rendered it with. */
function editedSinceRender(form: HTMLFormElement): boolean {
  return [...form.elements].some((field) => {
    if (field instanceof HTMLInputElement) return field.checked !== field.defaultChecked;
    if (field instanceof HTMLSelectElement) {
      return [...field.options].some((option) => option.selected !== option.defaultSelected);
    }
    return false;
  });
}

const selectClass =
  "min-h-11 rounded-sm border border-ink-subtle bg-ink px-3 text-mist hover:border-mist";

/**
 * The shop's filter form around the server-rendered results. Every change updates the
 * URL (replacing the history entry) and the server re-renders the results; without
 * JavaScript it is a plain GET form. On phones the filters fold behind a button.
 */
export function CatalogControls(props: Props) {
  const { groups, availableOnly, price, sort, labels } = props;
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const panelId = useId();
  const resultsId = useId();

  function apply() {
    const form = formRef.current;
    if (!form) return;
    const query = formQuery(form).toString();
    if (query === props.queryKey) return;
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
    );
  }

  // On hydration, apply anything changed before the page was interactive. After a
  // navigation the form didn't make (a "Clear filters" link, back/forward), put the
  // fields back in line with the URL: their defaults follow the props, so reset().
  const mounted = useRef(false);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    if (!mounted.current) {
      mounted.current = true;
      if (editedSinceRender(form)) apply();
    } else if (formQuery(form).toString() !== props.queryKey) {
      form.reset();
    }
    // apply() only reads the form and the current props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.queryKey]);

  function showResults(event: FormEvent) {
    event.preventDefault();
    apply();
    setOpen(false);
    document.getElementById(resultsId)?.focus();
  }

  const activeCount =
    groups.reduce((n, g) => n + g.selected.length, 0) +
    (availableOnly.checked ? 1 : 0) +
    (price.min.value ? 1 : 0) +
    (price.max.value ? 1 : 0);

  return (
    <form
      ref={formRef}
      action={props.action}
      method="get"
      onChange={apply}
      onSubmit={showResults}
      className="md:grid md:grid-cols-[13rem_1fr] md:gap-x-10 lg:grid-cols-[15rem_1fr]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist/15 pb-4 md:col-start-2">
        <p
          id={resultsId}
          tabIndex={-1}
          aria-live="polite"
          className="w-full font-semibold focus:outline-none md:w-auto"
        >
          {props.resultCount}
        </p>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="min-h-11 rounded-sm border border-ink-subtle px-4 font-semibold hover:border-mist md:hidden"
          >
            {labels.toggle}
            {activeCount > 0 && ` (${activeCount})`}
          </button>
          <label className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="text-sm whitespace-nowrap text-ink-subtle">{sort.label}</span>
            <select
              name={sort.name}
              defaultValue={sort.value}
              className={`min-w-0 flex-1 md:flex-none ${selectClass}`}
            >
              {sort.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        id={panelId}
        className={`${open ? "" : "hidden"} border-b border-mist/15 md:col-start-1 md:row-span-2 md:row-start-1 md:block md:border-b-0`}
      >
        <h2 className="sr-only">{labels.heading}</h2>
        <label className="flex min-h-11 items-center gap-3 py-2 font-semibold">
          <input
            type="checkbox"
            name={availableOnly.name}
            value="1"
            defaultChecked={availableOnly.checked}
            className="size-5 accent-gold"
          />
          {availableOnly.label}
        </label>

        {groups.map((group) => (
          <fieldset key={group.name} className="border-t border-mist/15 pt-1 pb-3">
            <legend className="sr-only">{group.legend}</legend>
            <p aria-hidden="true" className="pt-2 pb-1 font-bold text-gold">
              {group.legend}
            </p>
            {group.options.map((option) => (
              <label key={option.value} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name={group.name}
                  value={option.value}
                  defaultChecked={group.selected.includes(option.value)}
                  className="size-5 shrink-0 accent-gold"
                />
                <span translate={option.translate === false ? "no" : undefined}>
                  {option.label}
                </span>
              </label>
            ))}
          </fieldset>
        ))}

        <fieldset className="border-t border-mist/15 pt-1 pb-3">
          <legend className="sr-only">{price.legend}</legend>
          <p aria-hidden="true" className="pt-2 pb-2 font-bold text-gold">
            {price.legend}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[price.min, price.max].map((limit) => (
              <label key={limit.name} className="grid min-w-0 gap-1">
                <span className="text-sm text-ink-subtle">{limit.label}</span>
                <select
                  name={limit.name}
                  defaultValue={limit.value}
                  className={`w-full min-w-0 ${selectClass}`}
                >
                  <option value="">{price.anyLabel}</option>
                  {price.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Phones: closes the panel to show the results. Without JavaScript it submits. */}
        <button
          type="submit"
          className={`mb-4 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-fiesta px-5 font-semibold text-white hover:bg-fiesta-deep ${hydrated ? "md:hidden" : ""}`}
        >
          {labels.apply}
        </button>
      </div>

      <div
        aria-busy={isPending}
        className={`pt-6 transition-opacity md:col-start-2 ${isPending ? "opacity-60" : ""}`}
      >
        {props.children}
      </div>
    </form>
  );
}
