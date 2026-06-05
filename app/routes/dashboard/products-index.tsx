import { Link, useLoaderData } from "react-router";
import { FeatureUpgradeCallout } from "~/components/business/feature-upgrade-callout";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { requireUser } from "~/lib/auth.server";
import {
	featureLimit,
	hasFeature,
	resolveFlagsForBusiness,
} from "~/lib/feature-flags.server";
import { effectivePlanTier, subscriptionStatus } from "~/lib/plan";
import { PRODUCT_IMAGE_BUCKET, getPublicUrl } from "~/lib/storage.server";
import { formatBRL } from "~/lib/validation/business";
import * as businessesRepo from "~/repositories/businesses";
import * as productsRepo from "~/repositories/products";
import { isError, unwrap } from "~/types";
import type { Route } from "./+types/products-index";

export const meta: Route.MetaFunction = () => [
	{ title: "Produtos — JoaoTem" },
];

export async function loader({ params, request }: Route.LoaderArgs) {
	const ctx = await requireUser(request);
	const businessResult = await businessesRepo.getByIdForOwner({
		supabase: ctx.supabase,
		id: params.id,
		userId: ctx.user.id,
	});
	if (isError(businessResult)) {
		throw new Response(businessResult.error, { status: 500 });
	}
	const business = businessResult.success;
	if (!business) throw new Response("Negócio não encontrado", { status: 404 });

	const productsResult = await productsRepo.listByBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
	});

	const products = unwrap(productsResult) as Array<{
		id: string;
		name: string;
		description: string | null;
		price_cents: number;
		stock_quantity: number | null;
		is_active: boolean;
		images: { id: string; storage_path: string; sort_order: number }[];
	}>;

	const effTier = effectivePlanTier({
		plan_tier: business.plan_tier,
		plan_expires_at: business.plan_expires_at,
	});
	const flags = await resolveFlagsForBusiness({
		supabase: ctx.supabase,
		businessId: business.id,
		planTier: effTier,
	});
	const canUseProducts = hasFeature(flags, "vitrine_produtos");
	const productLimit = featureLimit(flags, "vitrine_produtos");
	const currentCount = products.length;
	const atLimit = productLimit !== null && currentCount >= productLimit;

	return {
		business: { id: business.id, name: business.name, handle: business.handle },
		subscriptionStatus: subscriptionStatus({
			plan_tier: business.plan_tier,
			plan_started_at: business.plan_started_at,
			plan_expires_at: business.plan_expires_at,
		}),
		canUseProducts,
		productLimit,
		currentCount,
		atLimit,
		products: products?.map((p) => {
			const firstImage = [...(p.images ?? [])].sort(
				(a, b) => a.sort_order - b.sort_order,
			)[0];
			return {
				...p,
				image_url: firstImage
					? getPublicUrl(ctx.supabase, PRODUCT_IMAGE_BUCKET, firstImage.storage_path)
					: null,
			};
		}),
	};
}

export async function action({ params, request }: Route.ActionArgs) {
	const ctx = await requireUser(request);
	const formData = await request.formData();
	const intent = formData.get("intent");
	const productId = formData.get("product_id");
	if (intent === "delete" && typeof productId === "string") {
		await productsRepo.softDelete({ supabase: ctx.supabase, id: productId });
	}
	return null;
}

export default function ProductsIndex() {
	const {
		business,
		subscriptionStatus: status,
		products,
		canUseProducts,
		productLimit,
		currentCount,
		atLimit,
	} = useLoaderData<typeof loader>();
	const newProductDisabled = !canUseProducts || atLimit;
	return (
		<main className="mx-auto max-w-5xl px-4 py-8">
			<div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-tight">
						Produtos de {business.name}
					</h1>
					<p className="text-sm text-muted-foreground">
						Adicione produtos para que apareçam na sua página.
						{productLimit !== null
							? ` (${currentCount}/${productLimit})`
							: null}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						to={`/dashboard/businesses/${business.id}`}
						className={buttonVariants({ variant: "ghost", size: "default" })}
					>
						Voltar ao negócio
					</Link>
					{newProductDisabled ? (
						<span
							className={buttonVariants({
								variant: "default",
								size: "default",
								className: "pointer-events-none opacity-50",
							})}
							aria-disabled
						>
							Novo produto
						</span>
					) : (
						<Link
							to={`/dashboard/businesses/${business.id}/products/new`}
							className={buttonVariants({ variant: "default", size: "default" })}
						>
							Novo produto
						</Link>
					)}
				</div>
			</div>

			{!canUseProducts ? (
				<FeatureUpgradeCallout
					business={business}
					status={status}
					feature="Vitrine de produtos"
					action="publicar produtos"
					itemPlural="produtos"
				/>
			) : atLimit ? (
				<FeatureUpgradeCallout
					business={business}
					status={status}
					feature="Vitrine de produtos"
					action="publicar produtos"
					itemPlural="produtos"
					limit={productLimit ?? undefined}
				/>
			) : null}

			{products.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Você ainda não cadastrou nenhum produto.
					</p>
				</div>
			) : !canUseProducts ? (
				<div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						Apenas negócios no plano Ouro podem cadastrar produtos.
					</p>
				</div>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{products.map((p) => (
						<li
							key={p.id}
							className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
						>
							<div className="flex items-center gap-3">
								<div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-background">
									{p.image_url ? (
										<img
											src={p.image_url}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
											•
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<h2 className="truncate text-sm font-semibold">{p.name}</h2>
									<p className="truncate text-xs text-muted-foreground">
										{formatBRL(p.price_cents)}
										{p.stock_quantity != null
											? ` · ${p.stock_quantity} em estoque`
											: ""}
									</p>
								</div>
								{!p.is_active ? (
									<Badge variant="outline">Inativo</Badge>
								) : null}
							</div>
							<div className="flex items-center gap-2">
								<Link
									to={`/dashboard/businesses/${business.id}/products/${p.id}`}
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									Editar
								</Link>
								<form method="post" className="inline">
									<input type="hidden" name="intent" value="delete" />
									<input type="hidden" name="product_id" value={p.id} />
									<Button variant="ghost" size="sm" type="submit">
										Excluir
									</Button>
								</form>
							</div>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
