// Build a Google Maps directions (turn-by-turn) deep link from a pasted place
// URL. Place URLs embed the pin as the LAST `!3d<lat>!4d<lng>` pair (earlier
// pairs are intermediate references like the city); the `@lat,lng` viewport
// center is a coarser fallback. If neither parses (e.g. shortened
// `maps.app.goo.gl` links), return the raw URL so the chip still works.
export function buildDirectionsUrl(raw: string | null | undefined): string | null {
	const url = raw?.trim();
	if (!url) return null;

	const dataPairs = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
	const last = dataPairs.at(-1);
	if (last) {
		return `https://www.google.com/maps/dir/?api=1&destination=${last[1]},${last[2]}`;
	}

	const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
	if (at) {
		return `https://www.google.com/maps/dir/?api=1&destination=${at[1]},${at[2]}`;
	}

	return url;
}
