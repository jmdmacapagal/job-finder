import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  /** Builds the link for a given page, so callers can keep their other search params. */
  hrefFor: (page: number) => string;
};

export function Pagination({ page, totalPages, total, hrefFor }: Props) {
  if (totalPages <= 1) {
    return total > 0 ? <p className="text-center text-sm text-muted">{total} total</p> : null;
  }

  return (
    <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn-secondary">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">
        Page {page} of {totalPages} · {total} total
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="btn-secondary">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
