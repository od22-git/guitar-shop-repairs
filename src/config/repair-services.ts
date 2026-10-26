// Repair services and their starting prices on /repairs, in fils (1 AED = 100 fils).
// Names and descriptions are in messages/*.json under Repairs.services. Every job is
// quoted after the instrument is checked; these only say where a job starts.
// Placeholder prices for the owner to set before launch.
export const repairServices = [
  { key: "setup", fromFils: 150_00 },
  { key: "strings", fromFils: 60_00 },
  { key: "frets", fromFils: 350_00 },
  { key: "refret", fromFils: 1_200_00 },
  { key: "electronics", fromFils: 100_00 },
  { key: "nut", fromFils: 180_00 },
] as const;
