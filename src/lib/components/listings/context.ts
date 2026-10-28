import { getContext, setContext } from 'svelte';
import type { Article } from './articles';

export type ArticleView = 'list' | 'grid';

/** Ce que le layout (articles) partage avec la page de statut affichée. */
export type ArticlesContext<T extends Article = Article> = {
	/** Articles du statut courant, après recherche, filtres et tri. */
	readonly items: T[];
	/** Nombre d'articles du statut avant recherche et filtres. */
	readonly total: number;
	readonly view: ArticleView;
	/** Articles du statut courant, sans recherche ni filtre (résolution de `?id=`). */
	readonly all: T[];
	/** Article ouvert dans le panneau latéral (`?id=`), s'il existe dans le statut courant. */
	readonly selected: T | undefined;
	open: (id: string) => void;
	close: () => void;
	/** Retire la recherche et les filtres (le tri est conservé). */
	reset: () => void;
};

const KEY = Symbol('articles');

export const setArticlesContext = (context: ArticlesContext) => setContext(KEY, context);

export const getArticlesContext = <T extends Article>() => getContext<ArticlesContext<T>>(KEY);
