import { getDashboard } from './dashboard.remote';
import { command, query } from '$app/server';
import * as v from 'valibot';
import { asc, desc, eq, ilike, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { expenses, expenseCategories, expenseObjects } from '$lib/server/db/schema';

export const getExpenses = query(async () =>
	getDb()
		.select({
			id: expenses.id,
			name: expenseObjects.name,
			category: expenseCategories.name,
			price: expenses.price,
			date: sql<string>`to_char(${expenses.created_at} at time zone 'UTC' at time zone 'Europe/Paris', 'YYYY-MM-DD')`
		})
		.from(expenses)
		.innerJoin(expenseObjects, eq(expenses.object_id, expenseObjects.id))
		.innerJoin(expenseCategories, eq(expenseObjects.category_id, expenseCategories.id))
		.orderBy(desc(expenses.created_at), desc(expenses.id))
);

export const searchExpenseCategories = query(
	v.object({
		search: v.string(),
		offset: v.pipe(v.number(), v.integer(), v.minValue(0)),
		limit: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))
	}),
	async ({ search, offset, limit }) =>
		getDb()
			.select({ uuid: expenseCategories.id, value: expenseCategories.name })
			.from(expenseCategories)
			.where(ilike(expenseCategories.name, `${search}%`))
			.orderBy(asc(expenseCategories.name))
			.offset(offset)
			.limit(limit)
);

export const createExpense = command(
	v.object({
		category: v.object({
			uuid: v.nullable(v.pipe(v.string(), v.uuid())),
			value: v.pipe(v.string(), v.trim(), v.minLength(1))
		}),
		name: v.pipe(v.string(), v.trim(), v.minLength(1)),
		price: v.pipe(v.number(), v.finite(), v.minValue(0.01))
	}),
	async ({ category, name, price }) => {
		await getDb().transaction(async (tx) => {
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
			await tx
				.insert(expenseObjects)
				.values({ name, category_id: categoryId })
				.onConflictDoNothing();
			const [object] = await tx.select().from(expenseObjects).where(eq(expenseObjects.name, name));
			// Names are globally unique in the existing schema: never silently move
			// earlier expenses to a different category when reusing a name.
			if (object.category_id !== categoryId)
				throw new Error('Ce nom existe dans une autre catégorie. Choisis un autre nom.');
			await tx.insert(expenses).values({ object_id: object.id, price: Math.round(price * 100) });
		});
		await getExpenses().refresh();
		await getDashboard().refresh();
	}
);
