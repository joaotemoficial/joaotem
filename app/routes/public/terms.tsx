import { Link, useLoaderData } from "react-router";
import { Mail, Phone } from "lucide-react";
import { SiteFooter } from "~/components/nav/site-footer";
import { SiteHeader } from "~/components/nav/site-header";
import { getSessionAndProfile } from "~/lib/auth.server";
import type { Route } from "./+types/terms";

const LAST_UPDATED = "23 de maio de 2026";

type Block =
	| { kind: "p"; text: string }
	| { kind: "subtitle"; text: string }
	| { kind: "list"; items: readonly string[] };

type Section = { title: string; blocks: readonly Block[] };

const INTRO = [
	"Bem-vindo ao João Tem, plataforma digital de guia comercial, vitrine virtual e marketplace local voltada à divulgação de empresas, profissionais, produtos e serviços da cidade de Orós/CE e região.",
	"Ao acessar, criar conta, anunciar, contratar planos ou utilizar qualquer funcionalidade da plataforma, o usuário declara ter lido, compreendido e aceitado integralmente os presentes Termos de Uso.",
] as const;

const SECTIONS: readonly Section[] = [
	{
		title: "Sobre a plataforma",
		blocks: [
			{ kind: "p", text: "O João Tem atua como:" },
			{
				kind: "list",
				items: [
					"guia comercial online;",
					"vitrine digital de empresas;",
					"plataforma de divulgação;",
					"ambiente de aproximação entre consumidores e anunciantes;",
					"marketplace local.",
				],
			},
			{
				kind: "p",
				text: "O João Tem não fabrica, vende diretamente, entrega ou garante produtos e serviços anunciados por terceiros, salvo quando expressamente informado.",
			},
		],
	},
	{
		title: "Aceitação dos termos",
		blocks: [
			{ kind: "p", text: "Ao utilizar a plataforma, o usuário concorda com:" },
			{
				kind: "list",
				items: [
					"estes Termos de Uso;",
					"Política de Privacidade;",
					"regras de anúncios e utilização da plataforma;",
					"legislação brasileira aplicável.",
				],
			},
			{
				kind: "p",
				text: "Caso não concorde com os termos, o usuário deverá interromper imediatamente o uso da plataforma.",
			},
		],
	},
	{
		title: "Cadastro e responsabilidade das informações",
		blocks: [
			{
				kind: "p",
				text: "O anunciante/comerciante é o único responsável por:",
			},
			{
				kind: "list",
				items: [
					"informações cadastradas;",
					"preços;",
					"promoções;",
					"imagens;",
					"logotipos;",
					"descrições;",
					"contatos;",
					"horários;",
					"produtos e serviços divulgados.",
				],
			},
			{ kind: "p", text: "O João Tem não se responsabiliza por:" },
			{
				kind: "list",
				items: [
					"informações falsas;",
					"propaganda enganosa;",
					"erros de preços;",
					"indisponibilidade de produtos;",
					"atrasos;",
					"cancelamentos;",
					"problemas entre comprador e vendedor.",
				],
			},
			{
				kind: "p",
				text: "O anunciante declara possuir autorização legal para utilizar:",
			},
			{
				kind: "list",
				items: [
					"marca;",
					"logotipo;",
					"imagens;",
					"fotos;",
					"materiais publicitários;",
					"conteúdos enviados à plataforma.",
				],
			},
		],
	},
	{
		title: "Responsabilidade dos anunciantes",
		blocks: [
			{
				kind: "p",
				text: "Ao contratar qualquer plano da plataforma, o anunciante declara que:",
			},
			{
				kind: "list",
				items: [
					"possui autorização para divulgar sua empresa;",
					"possui direitos sobre os materiais enviados;",
					"responde integralmente pelos anúncios publicados;",
					"cumpre a legislação brasileira;",
					"não divulgará conteúdos ilegais, ofensivos ou enganosos.",
				],
			},
			{ kind: "p", text: "É proibido anunciar:" },
			{
				kind: "list",
				items: [
					"produtos ilícitos;",
					"pirataria;",
					"conteúdos criminosos;",
					"golpes;",
					"serviços ilegais;",
					"materiais que violem direitos autorais;",
					"conteúdos ofensivos, discriminatórios ou difamatórios.",
				],
			},
			{ kind: "p", text: "O João Tem poderá remover anúncios sem aviso prévio." },
		],
	},
	{
		title: "Limitação de responsabilidade",
		blocks: [
			{
				kind: "p",
				text: "O João Tem atua apenas como plataforma intermediadora digital.",
			},
			{
				kind: "p",
				text: "Dessa forma, não poderá ser responsabilizado por:",
			},
			{
				kind: "list",
				items: [
					"negociações realizadas entre usuários;",
					"danos morais;",
					"danos materiais;",
					"prejuízos financeiros;",
					"fraudes;",
					"golpes;",
					"descumprimento de ofertas;",
					"problemas de entrega;",
					"qualidade de produtos;",
					"atendimento prestado pelos anunciantes;",
					"informações publicadas por terceiros.",
				],
			},
			{
				kind: "p",
				text: "O usuário concorda que utiliza a plataforma por sua conta e risco.",
			},
		],
	},
	{
		title: "Direitos autorais e uso de imagem",
		blocks: [
			{
				kind: "p",
				text: "Todo anunciante é responsável pelo conteúdo enviado à plataforma.",
			},
			{
				kind: "p",
				text: "Ao publicar materiais no João Tem, o anunciante declara possuir autorização para uso de:",
			},
			{
				kind: "list",
				items: [
					"fotos;",
					"imagens;",
					"logotipos;",
					"marcas;",
					"vídeos;",
					"textos;",
					"identidade visual.",
				],
			},
			{
				kind: "p",
				text: "Caso terceiros aleguem violação de direitos autorais ou uso indevido de imagem, a responsabilidade será exclusivamente do anunciante que realizou a publicação.",
			},
			{
				kind: "p",
				text: "O João Tem poderá remover conteúdos mediante denúncia ou suspeita de irregularidade.",
			},
		],
	},
	{
		title: "Planos e assinaturas",
		blocks: [
			{
				kind: "p",
				text: "A plataforma poderá disponibilizar planos gratuitos e pagos, incluindo:",
			},
			{ kind: "subtitle", text: "Plano Básico" },
			{
				kind: "list",
				items: [
					"exibição comercial simples;",
					"contato;",
					"categoria;",
					"foto;",
					"divulgação básica.",
				],
			},
			{ kind: "subtitle", text: "Plano Ouro" },
			{
				kind: "list",
				items: [
					"vitrine digital;",
					"destaque na plataforma;",
					"exibição prioritária;",
					"cadastro de produtos;",
					"promoções;",
					"recursos avançados.",
				],
			},
			{
				kind: "p",
				text: "Os valores, recursos e condições poderão ser alterados sem aviso prévio.",
			},
		],
	},
	{
		title: "Pagamentos e cancelamentos",
		blocks: [
			{
				kind: "p",
				text: "Os pagamentos realizados pelos anunciantes referem-se exclusivamente ao espaço de divulgação digital contratado.",
			},
			{ kind: "p", text: "O não pagamento poderá resultar em:" },
			{
				kind: "list",
				items: [
					"suspensão do anúncio;",
					"remoção da vitrine;",
					"cancelamento da conta;",
					"perda de destaque.",
				],
			},
			{
				kind: "p",
				text: "O João Tem poderá cancelar anúncios que violem estes termos.",
			},
		],
	},
	{
		title: "Disponibilidade da plataforma",
		blocks: [
			{ kind: "p", text: "O João Tem poderá:" },
			{
				kind: "list",
				items: [
					"alterar funcionalidades;",
					"suspender serviços;",
					"realizar manutenção;",
					"atualizar recursos;",
					"remover conteúdos;",
					"interromper atividades temporariamente.",
				],
			},
			{
				kind: "p",
				text: "Não garantimos funcionamento contínuo e ininterrupto da plataforma.",
			},
		],
	},
	{
		title: "Privacidade e dados",
		blocks: [
			{
				kind: "p",
				text: "Ao utilizar a plataforma, o usuário concorda com a coleta e tratamento de dados necessários para:",
			},
			{
				kind: "list",
				items: [
					"funcionamento do sistema;",
					"autenticação;",
					"comunicação;",
					"segurança;",
					"melhorias da plataforma.",
				],
			},
			{
				kind: "p",
				text: "O João Tem compromete-se a proteger os dados conforme a legislação aplicável, incluindo a LGPD (Lei Geral de Proteção de Dados).",
			},
		],
	},
	{
		title: "Conduta dos usuários",
		blocks: [
			{ kind: "p", text: "É proibido:" },
			{
				kind: "list",
				items: [
					"utilizar a plataforma para práticas ilegais;",
					"tentar invadir o sistema;",
					"copiar conteúdos sem autorização;",
					"disseminar spam;",
					"aplicar golpes;",
					"utilizar robôs ou automações maliciosas;",
					"prejudicar o funcionamento da plataforma.",
				],
			},
			{
				kind: "p",
				text: "O descumprimento poderá resultar em bloqueio permanente.",
			},
		],
	},
	{
		title: "Remoção de conteúdos",
		blocks: [
			{
				kind: "p",
				text: "O João Tem poderá remover, editar ou bloquear conteúdos e contas que:",
			},
			{
				kind: "list",
				items: [
					"violem estes termos;",
					"gerem riscos legais;",
					"recebam denúncias;",
					"apresentem suspeitas de fraude;",
					"utilizem marcas sem autorização;",
					"prejudiquem terceiros.",
				],
			},
		],
	},
	{
		title: "Isenção de garantias",
		blocks: [
			{
				kind: "p",
				text: "A plataforma é disponibilizada “no estado em que se encontra”.",
			},
			{ kind: "p", text: "O João Tem não garante:" },
			{
				kind: "list",
				items: [
					"aumento de vendas;",
					"geração de clientes;",
					"resultados financeiros;",
					"posicionamento específico;",
					"funcionamento sem erros.",
				],
			},
		],
	},
	{
		title: "Alterações dos termos",
		blocks: [
			{
				kind: "p",
				text: "Os presentes Termos poderão ser alterados a qualquer momento, sem aviso prévio.",
			},
			{
				kind: "p",
				text: "A continuidade do uso da plataforma será considerada aceitação das novas condições.",
			},
		],
	},
	{
		title: "Foro",
		blocks: [
			{
				kind: "p",
				text: "Fica eleito o foro da comarca mais próxima da cidade de Orós/CE, conforme legislação brasileira aplicável, para dirimir quaisquer conflitos relacionados à utilização da plataforma, com renúncia a qualquer outro, por mais privilegiado que seja.",
			},
		],
	},
] as const;

export const meta: Route.MetaFunction = () => [
	{ title: "Termos de Uso — João Tem" },
	{
		name: "description",
		content:
			"Termos de Uso do João Tem — guia comercial, vitrine digital e marketplace local de Orós/CE e região.",
	},
];

export async function loader({ request }: Route.LoaderArgs) {
	const ctx = await getSessionAndProfile(request);
	return {
		user: ctx.user ? { id: ctx.user.id, email: ctx.user.email ?? null } : null,
		profile: ctx.profile,
	};
}

function SectionBlocks({ blocks }: { blocks: readonly Block[] }) {
	return (
		<>
			{blocks.map((block, i) => {
				if (block.kind === "subtitle") {
					return (
						<h3
							key={i}
							className="mt-5 text-base font-semibold tracking-tight text-foreground"
						>
							{block.text}
						</h3>
					);
				}
				if (block.kind === "list") {
					return (
						<ul
							key={i}
							className="mt-3 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary/60"
						>
							{block.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					);
				}
				return (
					<p
						key={i}
						className="mt-3 text-sm leading-relaxed text-muted-foreground"
					>
						{block.text}
					</p>
				);
			})}
		</>
	);
}

export default function Terms() {
	const { user, profile } = useLoaderData<typeof loader>();

	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />

			{/* Cabeçalho */}
			<section className="border-b border-border/60 bg-secondary/40">
				<div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
					<span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
						Documento legal
					</span>
					<h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
						Termos de Uso
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Última atualização: {LAST_UPDATED}
					</p>
				</div>
			</section>

			<main className="mx-auto max-w-3xl px-4 py-12">
				{/* Introdução */}
				<div className="space-y-3">
					{INTRO.map((text) => (
						<p
							key={text}
							className="text-sm leading-relaxed text-muted-foreground"
						>
							{text}
						</p>
					))}
				</div>

				{/* Sumário */}
				<nav
					aria-label="Sumário"
					className="mt-8 rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
				>
					<p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Sumário
					</p>
					<ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
						{SECTIONS.map((section, i) => (
							<li key={section.title}>
								<a
									href={`#secao-${i + 1}`}
									className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
								>
									{i + 1}. {section.title}
								</a>
							</li>
						))}
					</ol>
				</nav>

				{/* Seções */}
				<div className="mt-10 flex flex-col gap-10">
					{SECTIONS.map((section, i) => (
						<section
							key={section.title}
							id={`secao-${i + 1}`}
							className="scroll-mt-20"
						>
							<h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
								{i + 1}. {section.title}
							</h2>
							<SectionBlocks blocks={section.blocks} />
						</section>
					))}

					{/* Contato */}
					<section id={`secao-${SECTIONS.length + 1}`} className="scroll-mt-20">
						<h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
							{SECTIONS.length + 1}. Contato
						</h2>
						<div className="mt-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
							<p className="font-semibold tracking-tight text-foreground">
								João Tem
							</p>
							<p className="text-sm text-muted-foreground">
								Guia Comercial e Marketplace Local
							</p>
							<div className="mt-4 flex flex-col gap-3">
								<a
									href="tel:+5588921822102"
									className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
								>
									<Phone className="size-4 text-primary" />
									(88) 92182-2102
								</a>
								<a
									href="mailto:joaotemoficial@gmail.com"
									className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
								>
									<Mail className="size-4 text-primary" />
									joaotemoficial@gmail.com
								</a>
							</div>
						</div>
					</section>
				</div>

				<div className="pt-12 text-center">
					<Link
						to="/"
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						← Voltar à página inicial
					</Link>
				</div>
			</main>

			<SiteFooter />
		</div>
	);
}
