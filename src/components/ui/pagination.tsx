import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /** Returns the href for a given target page number. */
  href: (page: number) => string;
  className?: string;
}

/**
 * Offset-based pagination bar.
 * Renders nothing when totalCount is 0.
 * Navigation buttons are hidden when there is only one page.
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  href,
  className,
}: PaginationProps) {
  if (totalCount === 0) return null;

  // Guard against an out-of-bounds page so "from" never exceeds "to".
  const rawFrom = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const from = Math.min(rawFrom, to);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("mt-4 flex flex-wrap items-center justify-between gap-3 text-sm", className)}
    >
      <span className="text-muted-foreground">
        Showing {from}–{to} of {totalCount} items
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={href(page - 1)}
              aria-label="Go to previous page"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-default opacity-50",
              )}
            >
              <ChevronLeft className="size-4" />
              Previous
            </span>
          )}

          <span className="tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={href(page + 1)}
              aria-label="Go to next page"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Next
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-default opacity-50",
              )}
            >
              Next
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
