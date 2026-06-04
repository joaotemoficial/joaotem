import { FaFacebookF, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

const socialLinks = [
  { href: "#", label: "Instagram", Icon: FaInstagram },
  { href: "#", label: "Facebook", Icon: FaFacebookF },
  { href: "https://wa.me/55", label: "WhatsApp", Icon: FaWhatsapp },
  { href: "#", label: "TikTok", Icon: FaTiktok },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("mt-12 border-t border-gray-200 bg-white", className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center">
        <Link to="/" aria-label="João Tem" className="inline-flex items-center">
          <img
            src="/joao-tem-logo.svg"
            alt="João Tem"
            className="h-14 w-auto object-contain"
          />
        </Link>

        <p className="text-sm text-gray-600">
          O guia comercial online de Orós - CE.
        </p>

        <div className="flex items-center gap-3">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              className="grid size-10 place-items-center rounded-full bg-gray-100 text-blue-600 transition-colors hover:bg-[#2563eb] hover:text-white"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link to="/termos" className="transition-colors hover:text-gray-900">
            Termos de uso
          </Link>
          <Link to="#" className="transition-colors hover:text-gray-900">
            Privacidade
          </Link>
          <Link to="#" className="transition-colors hover:text-gray-900">
            Contato
          </Link>
        </nav>

        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Joao Tem. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
