export type Theme = 'light' | 'dark';

export const THEME_KEY = 'theme';

/** Le sombre reste invisible tant que les écrans ne sont pas migrés vers les tokens (#14). */
export const DARK_MODE_ENABLED = false;

/** Thème mémorisé, sinon préférence système. */
export function resolveTheme(): Theme {
	try {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === 'light' || stored === 'dark') return stored;
	} catch {
		// localStorage indisponible : on retombe sur la préférence système
	}
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function setTheme(theme: Theme) {
	applyTheme(theme);
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {
		// choix non mémorisé, mais appliqué pour la session
	}
}
