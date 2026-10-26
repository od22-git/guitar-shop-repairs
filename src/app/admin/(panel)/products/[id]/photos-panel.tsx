"use client";

import Image from "next/image";

import { ActionForm } from "../../../_components/action-form";
import { inputClass, secondaryButton } from "../../../_components/form";
import { deletePhotoAction, movePhotoAction, updatePhotoAltAction } from "../actions";

import { PhotoUpload } from "./photo-upload";

type Photo = {
  id: number;
  src: string;
  width: number;
  height: number;
  altEn: string;
  altAr: string;
};

const small = `${secondaryButton} min-w-11 px-3`;

export function PhotosPanel({ productId, photos }: { productId: number; photos: Photo[] }) {
  return (
    <section
      aria-labelledby="photos-heading"
      className="flex flex-col gap-4 rounded-lg bg-paper p-4 sm:p-6"
    >
      <div>
        <h2 id="photos-heading" className="text-lg font-bold">
          Photos
        </h2>
        <p className="text-ink-muted">
          The first photo is the main one. Shoot the front, back, headstock and every flaw.
        </p>
      </div>

      {photos.length > 0 && (
        <ol className="flex flex-col gap-4">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              className="flex flex-col gap-3 border-b border-mist pb-4 sm:flex-row"
            >
              <Image
                src={photo.src}
                alt={photo.altEn || `Photo ${index + 1}`}
                width={photo.width}
                height={photo.height}
                sizes="160px"
                className="h-auto w-40 shrink-0 self-start rounded-md bg-mist"
              />
              <div className="flex flex-1 flex-col gap-2">
                <ActionForm
                  action={updatePhotoAltAction.bind(null, photo.id)}
                  className="flex flex-col gap-2"
                >
                  {(pending) => (
                    <>
                      <label htmlFor={`alt-en-${photo.id}`} className="text-sm font-medium">
                        Description in English
                      </label>
                      <input
                        id={`alt-en-${photo.id}`}
                        name="altEn"
                        defaultValue={photo.altEn}
                        placeholder="Headstock, front"
                        className={inputClass}
                      />
                      <label htmlFor={`alt-ar-${photo.id}`} className="text-sm font-medium">
                        Description in Arabic
                      </label>
                      <input
                        id={`alt-ar-${photo.id}`}
                        name="altAr"
                        lang="ar"
                        dir="rtl"
                        defaultValue={photo.altAr}
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${secondaryButton} self-start`}
                      >
                        Save description
                      </button>
                    </>
                  )}
                </ActionForm>
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={movePhotoAction.bind(null, photo.id, -1)}>
                    {(pending) => (
                      <button type="submit" disabled={pending || index === 0} className={small}>
                        Move earlier
                      </button>
                    )}
                  </ActionForm>
                  <ActionForm action={movePhotoAction.bind(null, photo.id, 1)}>
                    {(pending) => (
                      <button
                        type="submit"
                        disabled={pending || index === photos.length - 1}
                        className={small}
                      >
                        Move later
                      </button>
                    )}
                  </ActionForm>
                  <ActionForm
                    action={deletePhotoAction.bind(null, photo.id)}
                    confirm="Delete this photo?"
                  >
                    {(pending) => (
                      <button type="submit" disabled={pending} className={small}>
                        Delete photo {index + 1}
                      </button>
                    )}
                  </ActionForm>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <PhotoUpload productId={productId} />
    </section>
  );
}
