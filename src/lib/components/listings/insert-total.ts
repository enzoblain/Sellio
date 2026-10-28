/** Total (article + port) en centimes ; les champs vides ou invalides comptent pour 0. */
export function totalCents(price: number | undefined, shipping: number | undefined) {
	const cents = (value: number | undefined) =>
		typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
	return cents(price) + cents(shipping);
}
