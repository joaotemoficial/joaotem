import { useState } from "react";
import { Form, Link, useLoaderData } from "react-router";
import { PlanBadge } from "~/components/business/plan-badge";
import { SiteHeader } from "~/components/nav/site-header";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { getSessionAndProfile } from "~/lib/auth.server";
import {
	hasFeature,
	resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { effectivePlanTier } from "~/lib/plan";
import {
	PRODUCT_IMAGE_BUCKET,
	PROMOTION_IMAGE_BUCKET,
	getPublicUrl,
} from "~/lib/storage.server";
import { SYSTEM_USER_ID } from "~/lib/system-user";
import { formatBRL } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import * as promotionsRepo from "~/repositories/promotions";
import * as reclaimsRepo from "~/repositories/reclaims";
import { isError } from "~/types";
import type { Route } from "./+types/business-detail";

export const meta: Route.MetaFunction = ({ data }) => {
	if (!data?.business) return [{ title: "Negócio — JoaoTem" }];
	return [
		{ title: `${data.business.name} — JoaoTem` },
		{
			name: "description",
			content: data.business.short_description ?? data.business.name,
		},
	];
};

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await getSessionAndProfile(request);
	const businessResult = await businessesRepo.getByHandle({
		supabase: ctx.supabase,
		handle: params.handle,
	});
	if (isError(businessResult))
		throw new Response(businessResult.error, { status: 500 });
	if (!businessResult.success)
		throw new Response("Negócio não encontrado", { status: 404 });

	const business = businessResult.success;

	const ownerResult = await businessesRepo.getOwnerIdByHandle({
		supabase: ctx.supabase,
		handle: params.handle,
	});
	const isSystemOwned =
		!isError(ownerResult) &&
		ownerResult.success?.user_id === SYSTEM_USER_ID;

	const effTier = effectivePlanTier(business);
	const flags = await resolveFlagsForBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
		planTier: effTier,
	});
	const showProducts = hasFeature(flags, "vitrine_produtos");
	const showPromotions = hasFeature(flags, "promocoes_semana");
	const showSeloOuro = hasFeature(flags, "selo_ouro");

	const [productsResult, promotionsResult] = await Promise.all([
		showProducts
			? productsRepo.listPublicByBusiness({
				supabase: ctx.supabase,
				businessId: business.id,
			})
			: Promise.resolve({ success: [] as never[] }),
		showPromotions
			? promotionsRepo.listPublicActiveToday({
				supabase: ctx.supabase,
				businessId: business.id,
			})
			: Promise.resolve({ success: [] as never[] }),
	]);
	const products = isError(productsResult) ? [] : productsResult.success;
	const promotions = isError(promotionsResult) ? [] : promotionsResult.success;

	let alreadyRequested = false;
	if (ctx.user && isSystemOwned) {
		const mine = await reclaimsRepo.listMineForBusiness({
			supabase: ctx.supabase,
			businessId: business.id,
			userId: ctx.user.id,
		});
		if (!isError(mine)) {
			alreadyRequested = mine.success.some((r) => r.status === "pending");
		}
	}

	return {
		user: ctx.user
			? { id: ctx.user.id, email: ctx.user.email ?? null }
			: null,
		profile: ctx.profile,
		isSystemOwned,
		alreadyRequested,
		showSeloOuro,
		business: {
			...business,
			logo_url: getPublicUrl(ctx.supabase, "business-logos", business.logo_path),
			cover_url: getPublicUrl(
				ctx.supabase,
				"business-covers",
				business.cover_path,
			),
		},
		promotions: promotions.map((p) => {
			const cover = (p.images ?? []).slice().sort(
				(a, b) => a.sort_order - b.sort_order,
			)[0];
			return {
				id: p.id,
				title: p.title,
				description: p.description,
				schedule_note: p.schedule_note,
				cover_url: cover
					? getPublicUrl(ctx.supabase, PROMOTION_IMAGE_BUCKET, cover.storage_path)
					: null,
			};
		}),
		products: products?.map((p) => ({
			...p,
			images: (p.images ?? [])
				.slice()
				.sort((a, b) => a.sort_order - b.sort_order)
				.map((img) => ({
					id: img.id,
					url: getPublicUrl(ctx.supabase, PRODUCT_IMAGE_BUCKET, img.storage_path),
					alt_text: img.alt_text,
				})),
			optionGroups: (p.option_groups ?? [])
				.slice()
				.sort((a, b) => a.sort_order - b.sort_order)
				.map((group) => ({
					id: group.id,
					name: group.name,
					values: (group.values ?? [])
						.slice()
						.sort((a, b) => a.sort_order - b.sort_order)
						.map((val) => ({
							id: val.id,
							value: val.value,
							price_cents: val.price_cents,
						})),
				})),
		})),
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await getSessionAndProfile(request);
	if (!ctx.user) {
		return { reclaimError: "Faça login para reivindicar este negócio." };
	}

	const formData = await request.formData();
	if (formData.get("intent") !== "reclaim") {
		return { reclaimError: "Ação inválida." };
	}

	const ownerResult = await businessesRepo.getOwnerIdByHandle({
		supabase: ctx.supabase,
		handle: params.handle,
	});
	if (isError(ownerResult) || !ownerResult.success) {
		return { reclaimError: "Negócio não encontrado." };
	}
	if (ownerResult.success.user_id !== SYSTEM_USER_ID) {
		return { reclaimError: "Este negócio já tem um dono." };
	}

	const message = String(formData.get("message") ?? "").trim();
	const result = await reclaimsRepo.create({
		supabase: ctx.supabase,
		businessId: ownerResult.success.id,
		userId: ctx.user.id,
		message: message.length > 0 ? message : null,
	});
	if (isError(result)) {
		return { reclaimError: result.error };
	}
	return { reclaimOk: true };
}

export default function BusinessDetail({
	actionData,
}: Route.ComponentProps) {
	const {
		user,
		profile,
		business,
		products,
		promotions,
		isSystemOwned,
		alreadyRequested,
		showSeloOuro,
	} = useLoaderData<typeof loader>();

	const whatsappLink = `https://wa.me/55${business.whatsapp}`;
	const instagramHandle = business.instagram?.replace(/^@/, "");
	const instagramLink = instagramHandle
		? `https://instagram.com/${instagramHandle}`
		: null;

	return (
		<div className="min-h-svh bg-background">
			<SiteHeader user={user} role={profile?.role} />

			<div className="aspect-[16/6] w-full overflow-hidden bg-muted">
				{business.cover_url ? (
					<img
						src={business.cover_url}
						alt=""
						className="h-full w-full object-cover"
					/>
				) : null}
			</div>

			<main className="mx-auto max-w-4xl px-4 py-6">
				<div className="flex items-start gap-4">
					<div className="-mt-16 size-24 shrink-0 overflow-hidden rounded-2xl border-2 border-background bg-muted shadow">
						{business.logo_url ? (
							<img
								src={business.logo_url}
								alt=""
								className="h-full w-full object-cover"
							/>
						) : null}
					</div>
					<div className="flex-1 pt-1">
						<h1 className="text-2xl font-semibold tracking-tight">
							{business.name}
						</h1>
						<p className="text-sm text-muted-foreground">
							{business.category?.name ?? ""} · {business.neighborhood?.name} ·{" "}
							{business.city?.name} - {business.city?.state}
						</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							{showSeloOuro ? <PlanBadge tier="ouro" variant="solid" /> : null}
							{business.offers_delivery ? (
								<Badge variant="secondary">Faz entrega</Badge>
							) : null}
						</div>
					</div>
				</div>

				{business.short_description ? (
					<p className="mt-4 text-sm text-muted-foreground">
						{business.short_description}
					</p>
				) : null}

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<a
						href={whatsappLink}
						target="_blank"
						rel="noreferrer"
						className={buttonVariants({ variant: "default", size: "default" })}
					>
						Falar no WhatsApp
					</a>
					{instagramLink ? (
						<a
							href={instagramLink}
							target="_blank"
							rel="noreferrer"
							className={buttonVariants({ variant: "outline", size: "default" })}
						>
							Instagram
						</a>
					) : null}
				</div>

				{isSystemOwned ? (
					<ReclaimSection
						handle={business.handle}
						loggedIn={!!user}
						alreadyRequested={alreadyRequested}
						actionData={actionData}
					/>
				) : null}

				{promotions.length > 0 ? (
					<section className="mt-10">
						<h2 className="pb-3 text-lg font-semibold tracking-tight">
							Promoções de hoje
						</h2>
						<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{promotions.map((p) => (
								<li
									key={p.id}
									className="overflow-hidden rounded-2xl border border-border/70 bg-card"
								>
									<div className="aspect-[4/3] w-full overflow-hidden bg-muted">
										{p.cover_url ? (
											<img
												src={p.cover_url}
												alt=""
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										) : (
											<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
												sem imagem
											</div>
										)}
									</div>
									<div className="space-y-1 p-3">
										<p className="text-sm font-semibold">{p.title}</p>
										{p.description ? (
											<p className="line-clamp-3 text-xs text-muted-foreground">
												{p.description}
											</p>
										) : null}
										{p.schedule_note ? (
											<p className="text-xs text-muted-foreground">
												{p.schedule_note}
											</p>
										) : null}
									</div>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<section className="mt-10">
					<h2 className="pb-3 text-lg font-semibold tracking-tight">Produtos</h2>
					{products.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center">
							<p className="text-sm text-muted-foreground">
								Este negócio ainda não cadastrou produtos.
							</p>
						</div>
					) : (
						<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{products?.map((p) => (
								<ProductCard
									key={p.id}
									product={p}
									whatsappPhone={business.whatsapp}
								/>
							))}
						</ul>
					)}
				</section>

				<div className="pt-10 text-center">
					<Link
						to="/"
						className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					>
						← Ver mais negócios
					</Link>
				</div>
			</main>
		</div>
	);
}

type OptionValue = {
	id: string;
	value: string;
	price_cents: number | null;
};

type OptionGroup = {
	id: string;
	name: string;
	values: OptionValue[];
};

type PublicProduct = {
	id: string;
	name: string;
	description: string | null;
	price_cents: number;
	images: {
		id: string;
		url: string | null;
		alt_text: string | null;
	}[];
	optionGroups: OptionGroup[];
};

// A value's contribution to the running price: nulls cost nothing.
function valuePrice(value: OptionValue): number {
	return value.price_cents ?? 0;
}

// The cheapest value of a group — used to seed the default selection.
function cheapestValue(group: OptionGroup): OptionValue {
	return group.values.reduce(
		(min, v) => (valuePrice(v) < valuePrice(min) ? v : min),
		group.values[0],
	);
}

function ProductCard({
	product,
	whatsappPhone,
}: {
	product: PublicProduct;
	whatsappPhone: string;
}) {
	const cover = product.images[0];

	// A group with a single value is a static attribute (Validade: 6 meses);
	// with two or more it is a picker the customer chooses one value from.
	const staticGroups = product.optionGroups.filter(
		(g) => g.values.length === 1,
	);
	const selectableGroups = product.optionGroups.filter(
		(g) => g.values.length >= 2,
	);
	const anyPriced = product.optionGroups.some((g) =>
		g.values.some((v) => v.price_cents !== null),
	);

	const [selected, setSelected] = useState<Record<string, string>>(() => {
		const init: Record<string, string> = {};
		for (const g of selectableGroups) init[g.id] = cheapestValue(g).id;
		return init;
	});

	const selectedValue = (group: OptionGroup): OptionValue =>
		group.values.find((v) => v.id === selected[group.id]) ?? group.values[0];

	// Additive: each selected value's price contributes to the total. Static
	// groups always contribute their single value. When nothing is priced at
	// all, fall back to the product's base price.
	const optionsTotal =
		selectableGroups.reduce((sum, g) => sum + valuePrice(selectedValue(g)), 0) +
		staticGroups.reduce((sum, g) => sum + valuePrice(g.values[0]), 0);
	const effectivePrice = anyPriced ? optionsTotal : product.price_cents;

	const selectionParts = selectableGroups.map(
		(g) => `${g.name}: ${selectedValue(g).value}`,
	);
	const message =
		selectionParts.length > 0
			? `Olá! Tenho interesse no produto "${product.name}" — ${selectionParts.join(", ")} (${formatBRL(effectivePrice)}).`
			: `Olá! Tenho interesse no produto "${product.name}" (${formatBRL(effectivePrice)}).`;
	const whatsappHref = `https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(message)}`;

	return (
		<li className="overflow-hidden rounded-2xl border border-border/70 bg-card">
			<div className="aspect-square w-full overflow-hidden bg-muted">
				{cover?.url ? (
					<img
						src={cover.url}
						alt={cover.alt_text ?? product.name}
						className="h-full w-full object-cover"
						loading="lazy"
					/>
				) : (
					<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
						sem imagem
					</div>
				)}
			</div>
			<div className="space-y-2 p-3">
				<p className="truncate text-sm font-semibold">{product.name}</p>
				<p className="text-sm text-muted-foreground">
					<span className="font-medium text-foreground">
						{formatBRL(effectivePrice)}
					</span>
				</p>
				{product.description ? (
					<p className="line-clamp-2 text-xs text-muted-foreground">
						{product.description}
					</p>
				) : null}

				{staticGroups.length > 0 ? (
					<dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pt-1 text-xs text-muted-foreground">
						{staticGroups.map((group) => (
							<div key={group.id} className="contents">
								<dt className="font-medium">{group.name}:</dt>
								<dd>{group.values[0].value}</dd>
							</div>
						))}
					</dl>
				) : null}

				{selectableGroups.map((group) => (
					<fieldset key={group.id} className="pt-1">
						<legend className="pb-1 text-xs font-medium">{group.name}</legend>
						<div className="flex flex-wrap gap-1.5">
							{group.values.map((value) => {
								const checked = value.id === selected[group.id];
								return (
									<label
										key={value.id}
										className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition ${
											checked
												? "border-foreground bg-foreground text-background"
												: "border-border bg-background text-foreground hover:bg-muted"
										}`}
									>
										<input
											type="radio"
											name={`group-${group.id}`}
											value={value.id}
											checked={checked}
											onChange={() =>
												setSelected((prev) => ({
													...prev,
													[group.id]: value.id,
												}))
											}
											className="sr-only"
										/>
										{value.value}
										{value.price_cents !== null ? (
											<span className="font-medium">
												{" "}
												— {formatBRL(value.price_cents)}
											</span>
										) : null}
									</label>
								);
							})}
						</div>
					</fieldset>
				))}

				{product.images.length > 1 ? (
					<div className="flex gap-1.5 pt-1">
						{product.images.slice(1, 4).map((img) =>
							img.url ? (
								<img
									key={img.id}
									src={img.url}
									alt={img.alt_text ?? ""}
									className="size-8 rounded-md border border-border object-cover"
								/>
							) : null,
						)}
					</div>
				) : null}

				<a
					href={whatsappHref}
					target="_blank"
					rel="noreferrer"
					className={`${buttonVariants({ variant: "default", size: "sm" })} mt-2 w-full`}
				>
					Pedir no WhatsApp
				</a>
			</div>
		</li>
	);
}

function ReclaimSection({
	handle,
	loggedIn,
	alreadyRequested,
	actionData,
}: {
	handle: string;
	loggedIn: boolean;
	alreadyRequested: boolean;
	actionData:
	| { reclaimOk?: boolean; reclaimError?: string }
	| undefined;
}) {
	if (!loggedIn) {
		return (
			<section className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
				<p className="text-sm font-medium">É este o seu negócio?</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Faça login para reivindicar a propriedade deste cadastro.
				</p>
				<Link
					to={`/login?next=${encodeURIComponent(`/negocio/${handle}`)}`}
					className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}
				>
					Entrar para reivindicar
				</Link>
			</section>
		);
	}

	if (alreadyRequested || actionData?.reclaimOk) {
		return (
			<section className="mt-6 rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4">
				<p className="text-sm font-medium">Solicitação enviada</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Sua reivindicação está em análise. Você será notificado quando um
					administrador revisar.
				</p>
			</section>
		);
	}

	return (
		<section className="mt-6 rounded-2xl border border-border/70 bg-card p-4">
			<p className="text-sm font-medium">É este o seu negócio?</p>
			<p className="mt-1 text-xs text-muted-foreground">
				Envie uma reivindicação para que um administrador atribua este cadastro
				à sua conta.
			</p>
			<Form method="post" className="mt-3 flex flex-col gap-2">
				<input type="hidden" name="intent" value="reclaim" />
				<Textarea
					name="message"
					rows={3}
					maxLength={500}
					placeholder="Mensagem opcional (ex.: prove que é o dono)…"
				/>
				{actionData?.reclaimError ? (
					<p className="text-xs text-destructive">{actionData.reclaimError}</p>
				) : null}
				<div>
					<Button type="submit" size="sm">
						Reclamar este negócio
					</Button>
				</div>
			</Form>
		</section>
	);
}
