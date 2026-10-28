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
	/** Retire la recherche et les filtres (le tri est conservé). */
	reset: () => void;
};

const KEY = Symbol('articles');

export const setArticlesContext = (context: ArticlesContext) => setContext(KEY, context);

export const getArticlesContext = <T extends Article>() => getContext<ArticlesContext<T>>(KEY);
