// Rating sources
export const SOURCES = {
	DESCRIPTION: 0,
	GENRE: 1,
	SHELF: 2,
	REVIEW: 3,
}

export const INITIAL_SETTINGS = {
    POSITIVE_SEARCH_TERMS: [
        { term: 'clean', exclude: { before: ['not', 'isn\'t'], after: ['ing', 'er'] }},
        { term: 'no sex', exclude: { before: [], after: [] }},
        { term: 'young adult', exclude: { before: [], after: [] }},
		{ term: 'no explicit', exclude: { before: [], after: [] }},
		{ term: '', exclude: { before: [], after: [] }},
    ],
    NEGATIVE_SEARCH_TERMS: [
        { term: 'sex', exclude: { before: ['no'], after: ['ist'] }},
        { term: 'steamy', exclude: { before: ['no'], after: []}},
        { term: 'erotic', exclude: { before: ['not', 'isn\'t'], after: []}},
		{ term: 'explicit', exclude: { before: ['no', 'not', 'isn\'t'], after: ['ly']}},
		{ term: 'mature', exclude: { before: ['im', 'pre', 'not', 'isn\'t'], after: ['d']}},
		{ term: '', exclude: { before: [], after: [] }},
    ],
    SNIPPET_HALF_LENGTH: 65,
    ENABLED: true,
    CLEAN_BOOKS: [],
}