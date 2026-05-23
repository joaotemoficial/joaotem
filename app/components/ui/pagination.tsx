import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { buttonVariants } from "~/components/ui/button";

export function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const [params] = useSearchParams();

  if (totalPages <= 1) return null;

  const linkFor = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `?${next.toString()}`;
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginação"
      className="flex items-center justify-center gap-3 pt-8"
    >
      {hasPrev ? (
        <Link
          to={linkFor(page - 1)}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1",
          })}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Link>
      ) : (
        <span
          aria-disabled
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1 pointer-events-none opacity-50",
          })}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </span>
      )}

      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>

      {hasNext ? (
        <Link
          to={linkFor(page + 1)}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1",
          })}
        >
          Próxima
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span
          aria-disabled
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "gap-1 pointer-events-none opacity-50",
          })}
        >
          Próxima
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
