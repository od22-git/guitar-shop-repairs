"use client";

import { useEffect, useRef, useState } from "react";

import { FillPhoto } from "./fill-photo";

type Props = {
  images: { src: string; alt: string }[];
  labels: {
    /** Names the photo strip. */
    gallery: string;
    previous: string;
    next: string;
    /** "Photo 1 of 3", one per photo. */
    positions: string[];
    /** "Show photo 1", one per photo. */
    show: string[];
  };
};

const sizes = "(min-width: 1600px) 880px, (min-width: 768px) 56vw, 100vw";

function Chevron() {
  // Points to the inline end; flipped in Arabic, where "next" is to the left. Only the
  // control is mirrored, never the photos.
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 rtl:-scale-x-100">
      <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const arrowClass =
  "absolute top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white disabled:invisible";

/**
 * Product photos as a scroll-snap strip: swipe on touch screens, arrow keys once the strip
 * has focus, or the buttons and thumbnails. Scrolling follows the page direction, so in
 * Arabic the next photo comes from the left, as it should.
 */
export function ProductGallery({ images, labels }: Props) {
  const strip = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // scrollLeft is negative in right-to-left layouts.
        setCurrent(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  function show(index: number) {
    const slide = strip.current?.children[index];
    if (!slide) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    slide.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
    setCurrent(index);
  }

  const many = images.length > 1;

  return (
    <div>
      <div className="relative">
        <ul
          ref={strip}
          tabIndex={many ? 0 : undefined}
          aria-label={labels.gallery}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain bg-grey-100 [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <li
              key={image.src}
              aria-label={many ? labels.positions[i] : undefined}
              className="relative aspect-[4/5] w-full shrink-0 snap-start"
            >
              <FillPhoto src={image.src} alt={image.alt} sizes={sizes} eager={i === 0} />
            </li>
          ))}
        </ul>
        {many && (
          <>
            <button
              type="button"
              onClick={() => show(current - 1)}
              disabled={current === 0}
              aria-label={labels.previous}
              className={`${arrowClass} start-3`}
            >
              <span className="inline-flex -scale-x-100">
                <Chevron />
              </span>
            </button>
            <button
              type="button"
              onClick={() => show(current + 1)}
              disabled={current === images.length - 1}
              aria-label={labels.next}
              className={`${arrowClass} end-3`}
            >
              <Chevron />
            </button>
            <p aria-live="polite" className="sr-only">
              {labels.positions[current]}
            </p>
          </>
        )}
      </div>
      {many && (
        <ul className="mt-3 grid grid-cols-5 gap-2 md:gap-3">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => show(i)}
                aria-label={labels.show[i]}
                aria-current={i === current ? "true" : undefined}
                className="relative block aspect-[4/5] w-full overflow-hidden bg-grey-100 after:absolute after:inset-0 after:inset-ring-black hover:after:inset-ring-1 aria-[current=true]:after:inset-ring-2"
              >
                <FillPhoto src={image.src} alt="" sizes="(min-width: 768px) 11vw, 20vw" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
