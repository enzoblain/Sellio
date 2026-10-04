import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { expenses, expenseCategories, expenseObjects } from '$lib/server/db/schema';

export async function insertExpense(
	tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
	{
		category,
		name,
		price
	}: { category: { uuid: string | null; value: string }; name: string; price: number }
) {
	let categoryId = category.uuid;
	if (categoryId) {
		const [existing] = await tx
			.select()
			.from(expenseCategories)
			.where(eq(expenseCategories.id, categoryId));
		if (!existing) throw new Error('Catégorie introuvable.');
	} else {
		await tx.insert(expenseCategories).values({ name: category.value }).onConflictDoNothing();
		const [existing] = await tx
			.select()
			.from(expenseCategories)
			.where(eq(expenseCategories.name, category.value));
		categoryId = existing.id;
	}
	await tx.insert(expenseObjects).values({ name, category_id: categoryId }).onConflictDoNothing();
	const [object] = await tx
		.select()
		.from(expenseObjects)
		.where(and(eq(expenseObjects.name, name), eq(expenseObjects.category_id, categoryId)));
	await tx.insert(expenses).values({ object_id: object.id, price: Math.round(price * 100) });
}
