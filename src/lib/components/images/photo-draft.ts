export type PhotoDraft = { token: string; path: string; file?: File };
export function photoForm(photos: PhotoDraft[], cover: string | null) {
	const form = new FormData();
	const tokens = new Map<string, string>();
	let newIndex = 0;
	for (const photo of photos) {
		if (photo.file) {
			tokens.set(photo.token, `new:${newIndex++}`);
			form.append('photos', photo.file);
		} else tokens.set(photo.token, photo.token);
	}
	form.append(
		'manifest',
		JSON.stringify({
			order: photos.map((photo) => tokens.get(photo.token)),
			cover: cover ? tokens.get(cover) : null
		})
	);
	return form;
}
