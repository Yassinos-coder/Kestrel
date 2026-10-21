import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [5, 10, 25, 50];

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize?: (size: number) => void;
}

export function Pagination({ page, pages, total, pageSize, onPage, onPageSize }: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm text-muted-foreground">
      <span>
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSize(Number(event.target.value))}
              className="h-8 rounded-lg border bg-background px-2 text-foreground"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border p-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center text-foreground">
          {page} / {pages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border p-1.5 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
