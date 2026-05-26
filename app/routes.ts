import {
	type RouteConfig,
	index,
	layout,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/public/home.tsx"),
	route("negocios", "routes/public/businesses-index.tsx"),
	route("promocoes", "routes/public/promotions-index.tsx"),
	route("negocio/:handle", "routes/public/business-detail.tsx"),
	route("categoria/:slug", "routes/public/category.tsx"),
	route("bairro/:citySlug/:slug", "routes/public/neighborhood.tsx"),
	route("planos", "routes/public/plans.tsx"),
	route("termos", "routes/public/terms.tsx"),

	route("login", "routes/auth/login.tsx"),
	route("signup", "routes/auth/signup.tsx"),
	route("logout", "routes/auth/logout.tsx"),

	layout("routes/dashboard/layout.tsx", [
		route("dashboard", "routes/dashboard/index.tsx"),
		route("dashboard/upgrade", "routes/dashboard/upgrade.tsx"),
		route("dashboard/businesses/new", "routes/dashboard/business-new.tsx"),
		route("dashboard/businesses/:id", "routes/dashboard/business-edit.tsx"),
		route(
			"dashboard/businesses/:id/products",
			"routes/dashboard/products-index.tsx",
		),
		route(
			"dashboard/businesses/:id/products/new",
			"routes/dashboard/product-new.tsx",
		),
		route(
			"dashboard/businesses/:id/products/:productId",
			"routes/dashboard/product-edit.tsx",
		),
		route(
			"dashboard/businesses/:id/promotions",
			"routes/dashboard/promotions-index.tsx",
		),
		route(
			"dashboard/businesses/:id/promotions/new",
			"routes/dashboard/promotion-new.tsx",
		),
		route(
			"dashboard/businesses/:id/promotions/:promotionId",
			"routes/dashboard/promotion-edit.tsx",
		),
	]),

	layout("routes/admin/layout.tsx", [
		route("admin", "routes/admin/index.tsx"),
		route("admin/businesses", "routes/admin/businesses-index.tsx"),
		route("admin/businesses/new", "routes/admin/business-new.tsx"),
		route("admin/businesses/:id", "routes/admin/business-detail.tsx"),
		route("admin/reclaims", "routes/admin/reclaims.tsx"),
		route("admin/feature-flags", "routes/admin/feature-flags.tsx"),
	]),
] satisfies RouteConfig;
