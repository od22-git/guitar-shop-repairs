import { notFound } from "next/navigation";

// Unknown paths under /en or /ar render the localized not-found page in the site layout.
export default function CatchAll() {
  notFound();
}
