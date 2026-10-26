import { brand } from "@/config/brand";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">{brand.name.en}</h1>
      <p className="text-lg">{brand.tagline.en}</p>
      <p className="text-base opacity-80">{brand.location.en}. The site is being built.</p>
    </main>
  );
}
