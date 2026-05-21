import {
  Building2,
  Camera,
  Mail,
  MessageCircle,
  ThumbsUp,
} from "lucide-react";
import { Link } from "react-router";

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-blue-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span className="grid size-8 place-items-center">
                <Building2 className="size-4" />
              </span>
              JoaoTem
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-blue-50/90">
              O guia comercial online de Orós - CE. Encontre empresas, produtos
              e promoções perto de você.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-tight">
              Navegação
            </h3>
            <ul className="space-y-2.5 text-sm text-blue-50/90">
              <li>
                <Link to="/" className="transition-colors hover:text-white">
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/#categorias"
                  className="transition-colors hover:text-white"
                >
                  Categorias
                </Link>
              </li>
              <li>
                <Link
                  to="/#empresas-em-destaque"
                  className="transition-colors hover:text-white"
                >
                  Empresas
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="transition-colors hover:text-white"
                >
                  Cadastrar negócio
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-tight">
              Contato
            </h3>
            <ul className="space-y-2.5 text-sm text-blue-50/90">
              <li>
                <a
                  href="https://wa.me/55"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 transition-colors hover:text-white"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:contato@joaotem.com.br"
                  className="inline-flex items-center gap-2 transition-colors hover:text-white"
                >
                  <Mail className="size-4" />
                  contato@joaotem.com.br
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-tight">
              Siga-nos
            </h3>
            <div className="flex items-center gap-2">
              <Link
                to="#"
                aria-label="Instagram"
                className="grid size-9 place-items-center rounded-lg border border-white/30 bg-white/10 text-white transition-colors hover:bg-white hover:text-blue-600"
              >
                <Camera className="size-4" />
              </Link>
              <Link
                to="#"
                aria-label="Facebook"
                className="grid size-9 place-items-center rounded-lg border border-white/30 bg-white/10 text-white transition-colors hover:bg-white hover:text-blue-600"
              >
                <ThumbsUp className="size-4" />
              </Link>
              <Link
                to="https://wa.me/55"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="WhatsApp"
                className="grid size-9 place-items-center rounded-lg border border-white/30 bg-white/10 text-white transition-colors hover:bg-white hover:text-blue-600"
              >
                <MessageCircle className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/20 pt-6 sm:flex-row">
          <p className="text-xs text-blue-50/80">
            © {new Date().getFullYear()} JoaoTem. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-blue-50/80">
            <Link to="#" className="transition-colors hover:text-white">
              Termos de uso
            </Link>
            <span className="h-3 w-px bg-white/30" />
            <Link to="#" className="transition-colors hover:text-white">
              Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
