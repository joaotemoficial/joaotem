import {
  BookOpen,
  Car,
  ChevronLeft,
  ChevronRight,
  Footprints,
  Heart,
  House,
  type LucideIcon,
  PawPrint,
  Pill,
  Scissors,
  Shirt,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  UtensilsCrossed,
  Video,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

type Category = {
  id: string;
  name: string;
  slug: string;
};

const ICONS: Record<string, LucideIcon> = {
  alimentacao: UtensilsCrossed,
  "moda-e-acessorios": Shirt,
  "beleza-e-estetica": Sparkles,
  artesanato: Heart,
  servicos: Wrench,
  roupas: Shirt,
  calcados: Footprints,
  petshop: PawPrint,
  automotivo: Car,
  papelaria: BookOpen,
  eletricista: Zap,
  encanador: Wrench,
  cabelereiro: Scissors,
  barbearia: Scissors,
  "servicos-gerais": Wrench,
  supermercado: ShoppingCart,
  farmacia: Pill,
  influenciador: Video,
  imobiliaria: House,
  saude: Stethoscope,
  outros: Store,
  esportes: Store,
};

export function CategoriesCarousel({ categories }: { categories: Category[] }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => {
          const Icon = ICONS[c.slug] ?? Tag;
          return (
            <li key={c.id} className="snap-start shrink-0">
              <Link
                to={`/?category=${c.id}#empresas-em-destaque`}
                className="group flex h-40 w-32 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-7" />
                </span>
                <span className="flex h-10 items-center justify-center">
                  <span className="line-clamp-2 text-center text-[0.8rem] font-medium leading-tight text-foreground">
                    {c.name}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Categorias anteriores"
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full border border-border/70 bg-background shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}

      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Próximas categorias"
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full border border-border/70 bg-background shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : null}
    </div>
  );
}
