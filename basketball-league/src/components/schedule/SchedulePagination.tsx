import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Server-rendered prev/next pager. Links carry ?page=N on basePath.
export function SchedulePagination({
  page,
  totalPages,
  basePath,
  query,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams(query);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const ghost = buttonVariants({ variant: "outline", size: "sm" });
  const disabled = "pointer-events-none opacity-50";

  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={href(page - 1)}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(ghost, prevDisabled && disabled)}
      >
        <ChevronLeft className="size-4" /> Prev
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Link
        href={href(page + 1)}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(ghost, nextDisabled && disabled)}
      >
        Next <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
