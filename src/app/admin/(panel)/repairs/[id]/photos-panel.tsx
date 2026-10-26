"use client";

import { useState } from "react";

import type { RepairPhotoStage } from "@/lib/db/schema";

import { ActionForm } from "../../../_components/action-form";
import { inputClass, secondaryButton } from "../../../_components/form";
import { PhotoUpload } from "../../../_components/photo-upload";
import { deletePhotoAction, setPhotoVisibleAction } from "../actions";
import { photoStageLabels } from "../labels";

type Photo = {
  id: number;
  src: string;
  full: string;
  width: number;
  height: number;
  stage: RepairPhotoStage;
  customerVisible: boolean;
};

const stages = Object.entries(photoStageLabels) as [RepairPhotoStage, string][];

// The customer's instrument at intake (the record in a damage dispute), during the work
// and finished. Private: only the admin sees them, unless shown to the customer.
export function PhotosPanel({ ticketId, photos }: { ticketId: number; photos: Photo[] }) {
  const [stage, setStage] = useState<RepairPhotoStage>(photos.length === 0 ? "intake" : "progress");

  return (
    <section
      aria-labelledby="photos-heading"
      className="flex flex-col gap-4 rounded-lg bg-white p-4 sm:p-6"
    >
      <div>
        <h2 id="photos-heading" className="text-lg font-bold">
          Photos
        </h2>
        <p className="text-grey-600">
          At intake, photograph the whole instrument and every existing mark. Photos stay private
          unless you show them to the customer.
        </p>
      </div>

      {stages.map(([value, label]) => {
        const group = photos.filter((photo) => photo.stage === value);
        if (group.length === 0) return null;
        return (
          <div key={value} className="flex flex-col gap-2">
            <h3 className="font-bold">{label}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.map((photo, index) => (
                <li key={photo.id} className="flex flex-col gap-2">
                  <a href={photo.full} target="_blank">
                    {/* Private photos come from an authenticated route, not the image loader. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={`${label}, photo ${index + 1}`}
                      width={photo.width}
                      height={photo.height}
                      className="aspect-square w-full rounded-md bg-grey-100 object-cover"
                    />
                  </a>
                  <ActionForm
                    action={setPhotoVisibleAction.bind(null, photo.id, !photo.customerVisible)}
                  >
                    {(pending) => (
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${secondaryButton} w-full px-2 text-sm`}
                      >
                        {photo.customerVisible ? "Hide from customer" : "Show to customer"}
                      </button>
                    )}
                  </ActionForm>
                  <ActionForm
                    action={deletePhotoAction.bind(null, photo.id)}
                    confirm="Delete this photo?"
                  >
                    {(pending) => (
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${secondaryButton} w-full px-2 text-sm`}
                      >
                        Delete
                      </button>
                    )}
                  </ActionForm>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <div className="flex flex-wrap items-start gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="photo-stage" className="text-sm font-medium">
            Stage
          </label>
          <select
            id="photo-stage"
            value={stage}
            onChange={(event) => setStage(event.target.value as RepairPhotoStage)}
            className={inputClass}
          >
            {stages.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="pt-6">
          <PhotoUpload fields={{ ticketId: String(ticketId), stage }} />
        </div>
      </div>
    </section>
  );
}
