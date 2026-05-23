import { createCookie } from "react-router";
import { z } from "zod";

const secret = process.env.CART_COOKIE_SECRET ?? process.env.JWT_SECRET;

export const cartCookie = createCookie("jt_cart", {
	path: "/",
	httpOnly: true,
	sameSite: "lax",
	secure: process.env.NODE_ENV === "production",
	maxAge: 60 * 60 * 24 * 30,
	...(secret ? { secrets: [secret] } : {}),
});

const selectionSchema = z.object({
	groupId: z.string(),
	groupName: z.string(),
	valueId: z.string(),
	value: z.string(),
	priceCents: z.number().int(),
});

const itemSchema = z.object({
	key: z.string(),
	productId: z.string(),
	name: z.string(),
	unitPriceCents: z.number().int().nonnegative(),
	selections: z.array(selectionSchema),
	notes: z.string(),
	quantity: z.number().int().positive(),
});

export const cartItemsSchema = z.array(itemSchema);

const mapSchema = z.record(cartItemsSchema);

export type CartSelection = z.infer<typeof selectionSchema>;
export type StoredCartItem = z.infer<typeof itemSchema>;
export type CartMap = Record<string, StoredCartItem[]>;

export async function getCartMap(request: Request): Promise<CartMap> {
	const parsed = await cartCookie.parse(request.headers.get("Cookie"));
	const result = mapSchema.safeParse(parsed);
	return result.success ? result.data : {};
}

export async function getBusinessCart(
	request: Request,
	key: string,
): Promise<StoredCartItem[]> {
	const map = await getCartMap(request);
	return map[key] ?? [];
}

// Returns the Set-Cookie header value reflecting the updated map.
export async function setBusinessCart(
	request: Request,
	key: string,
	items: StoredCartItem[],
): Promise<string> {
	const map = await getCartMap(request);
	if (items.length === 0) {
		delete map[key];
	} else {
		map[key] = cartItemsSchema.parse(items);
	}
	return cartCookie.serialize(map);
}
