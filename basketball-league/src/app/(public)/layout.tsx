import { PublicNav } from "@/components/nav/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
