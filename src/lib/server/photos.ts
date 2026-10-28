import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { images, listings } from '$lib/server/db/schema';

export const uploadsDirectory = () => resolve(process.env.UPLOADS_DIR ?? 'uploads');
export const MAX_PHOTOS = 12;
export type ImageManifest = { order: string[]; cover: string | null };
export type PreparedPhoto = {
	token: string;
	id: string;
	path: string;
	mime_type: string;
	size_bytes: number;
	width: number;
	height: number;
};
export class PhotoError extends Error {}
export async function getListingPhotos(
	db: Pick<ReturnType<typeof getDb>, 'select'>,
	listingId: string
) {
	return db
		.select()
		.from(images)
		.where(eq(images.listing_id, listingId))
		.orderBy(desc(images.is_cover), asc(images.position), asc(images.id));
}
export function validateManifest(manifest: ImageManifest, existing: string[], uploaded: string[]) {
	if (
		!Array.isArray(manifest.order) ||
		manifest.order.length > MAX_PHOTOS ||
		new Set(manifest.order).size !== manifest.order.length
	)
		throw new PhotoError('Tu peux ajouter jusqu’à 12 photos, sans doublons.');
	const allowed = new Set([...existing, ...uploaded]);
	if (
		manifest.order.some((id) => !allowed.has(id)) ||
		uploaded.some((id) => !manifest.order.includes(id))
	)
		throw new PhotoError('La liste des photos a changé. Rouvre le formulaire.');
	if (manifest.order.length && (!manifest.cover || !manifest.order.includes(manifest.cover)))
		throw new PhotoError('Choisis une photo de couverture.');
	if (!manifest.order.length && manifest.cover !== null)
		throw new PhotoError('La couverture sélectionnée n’existe plus.');
}
export async function preparePhotos(files: File[]): Promise<PreparedPhoto[]> {
	if (files.length > MAX_PHOTOS) throw new PhotoError('Maximum 12 photos par article.');
	if (files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024)
		throw new PhotoError('Les photos ne doivent pas dépasser 30 Mo au total.');
	const prepared: PreparedPhoto[] = [];
	try {
		await mkdir(uploadsDirectory(), { recursive: true });
		for (let index = 0; index < files.length; index++) {
			const file = files[index];
			if (!file.size || file.size > 10 * 1024 * 1024)
				throw new PhotoError('Chaque photo doit faire moins de 10 Mo.');
			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
				throw new PhotoError('Format refusé. Seules les photos JPG, PNG et WebP sont autorisées.');
			const buffer = Buffer.from(await file.arrayBuffer());
			const input = sharp(buffer, { limitInputPixels: 40_000_000, animated: false });
			const metadata = await input.metadata();
			if (
				!metadata.format ||
				!['jpeg', 'png', 'webp'].includes(metadata.format) ||
				(metadata.pages ?? 1) > 1
			)
				throw new PhotoError('Utilise des photos JPG, PNG ou WebP non animées.');
			const expectedType = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[
				metadata.format as 'jpeg' | 'png' | 'webp'
			];
			if (file.type !== expectedType)
				throw new PhotoError(
					'Le contenu d’une photo ne correspond pas à son type. Choisis le fichier original.'
				);
			const { data, info } = await input
				.rotate()
				.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 85 })
				.toBuffer({ resolveWithObject: true });
			const id = randomUUID();
			await writeFile(join(uploadsDirectory(), `${id}.webp`), data, { flag: 'wx' });
			prepared.push({
				token: `new:${index}`,
				id,
				path: `/images/${id}.webp`,
				mime_type: 'image/webp',
				size_bytes: data.length,
				width: info.width,
				height: info.height
			});
		}
		return prepared;
	} catch (error) {
		await discardPhotos(prepared);
		if (error instanceof PhotoError) throw error;
		throw new PhotoError(
			'Une photo est invalide ou trop volumineuse. Utilise des fichiers JPG, PNG ou WebP.'
		);
	}
}
export async function discardPhotos(photos: PreparedPhoto[]) {
	await Promise.all(
		photos.map((photo) => unlink(join(uploadsDirectory(), `${photo.id}.webp`)).catch(() => {}))
	);
}
export async function removeUnusedPhotos(paths: string[]) {
	for (const path of new Set(paths)) {
		const match = /^\/images\/([0-9a-f-]{36}\.webp)$/.exec(path);
		if (!match) continue;
		const [used] = await getDb()
			.select({ id: images.id })
			.from(images)
			.where(eq(images.path, path))
			.limit(1);
		if (!used) await unlink(join(uploadsDirectory(), match[1])).catch(() => {});
	}
}
export async function applyPhotos(
	tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
	listingId: string,
	manifest: ImageManifest,
	prepared: PreparedPhoto[]
) {
	const originals = await getListingPhotos(tx, listingId);
	const reuseTokens = Array.isArray(manifest.order)
		? manifest.order.filter((token) => typeof token === 'string' && token.startsWith('reuse:'))
		: [];
	const reuseIds = reuseTokens.map((token) => token.slice(6));
	if (
		reuseIds.some(
			(id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
		)
	)
		throw new PhotoError('Référence de photo invalide.');
	const [listing] = await tx
		.select({ modelId: listings.model_id })
		.from(listings)
		.where(eq(listings.id, listingId));
	if (!listing) throw new PhotoError('Article introuvable.');
	const reusable = reuseIds.length
		? await tx
				.select({ photo: images })
				.from(images)
				.innerJoin(listings, eq(images.listing_id, listings.id))
				.where(and(eq(listings.model_id, listing.modelId), inArray(images.id, reuseIds)))
				.for('share')
		: [];
	validateManifest(
		manifest,
		[...originals.map((photo) => photo.id), ...reusable.map(({ photo }) => `reuse:${photo.id}`)],
		prepared.map((photo) => photo.token)
	);
	await tx.update(images).set({ is_cover: false }).where(eq(images.listing_id, listingId));
	for (const photo of originals)
		if (!manifest.order.includes(photo.id)) await tx.delete(images).where(eq(images.id, photo.id));
	for (let position = 0; position < manifest.order.length; position++) {
		const token = manifest.order[position];
		const upload = prepared.find((photo) => photo.token === token);
		const original = originals.find((photo) => photo.id === token);
		const values = { listing_id: listingId, position, is_cover: token === manifest.cover };
		if (upload) {
			await tx.insert(images).values({
				...values,
				id: upload.id,
				path: upload.path,
				mime_type: upload.mime_type,
				size_bytes: upload.size_bytes,
				width: upload.width,
				height: upload.height
			});
		} else if (original) await tx.update(images).set(values).where(eq(images.id, original.id));
		else {
			const source = reusable.find(({ photo }) => `reuse:${photo.id}` === token)?.photo;
			if (source)
				await tx
					.insert(images)
					.values({
						...values,
						path: source.path,
						mime_type: source.mime_type,
						size_bytes: source.size_bytes,
						width: source.width,
						height: source.height
					});
		}
	}
	return originals.filter((photo) => !manifest.order.includes(photo.id)).map((photo) => photo.path);
}
