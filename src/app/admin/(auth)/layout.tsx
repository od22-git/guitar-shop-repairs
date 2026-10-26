import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <p>
        <Wordmark className="text-xl" />
      </p>
      {children}
    </main>
  );
}
