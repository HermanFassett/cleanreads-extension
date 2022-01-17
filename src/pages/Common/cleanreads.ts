import {createChromeStorageStateHookLocal} from 'use-chrome-storage';

// Rating sources
export const SOURCES = {
	DESCRIPTION: 0,
	GENRE: 1,
	SHELF: 2,
	REVIEW: 3,
}

export const INITIAL_SETTINGS = {
    POSITIVE_SEARCH_TERMS: [
        { term: 'clean', exclude: { before: ['not', 'isn\'t'], after: ['ing'] }},
        { term: 'no sex', exclude: { before: [], after: [] }},
        { term: 'young adult', exclude: { before: [], after: [] }}
    ],
    NEGATIVE_SEARCH_TERMS: [
        { term: 'sex', exclude: { before: ['no'], after: ['ist'] }},
        { term: 'adult', exclude: { before: ['young', 'new'], after: ['hood', 'ing']}},
        { term: 'erotic', exclude: { before: ['not', 'isn\'t'], after: []}}
    ],
    SNIPPET_HALF_LENGTH: 65,
    ENABLED: true,
}

export const useSettings = createChromeStorageStateHookLocal('cleanreads_settings', INITIAL_SETTINGS);

// Get Cleanread rating for given book
export const cleanReadRating = async (book: any) => {
	// Description
	let results : Array<any> = await searchContent(book.description, SOURCES.DESCRIPTION);
	for (let i = 0; i < book.genres.length; i++) {
		const genre = book.genres[i];
		results = results.concat(await searchContent(genre.name, SOURCES.GENRE, undefined, genre.url))
	}
	// Shelves
	for (let i = 0; i < book.reviews.length; i++) {
		const review = book.reviews[i];
		for (let j = 0; j < review.shelves.length; j++) {
			const shelf = review.shelves[j];
			results = results.concat(await searchContent(shelf.name, SOURCES.SHELF, review.id, review.url));
		}
	};
	// Reviews
	for (let i = 0; i < book.reviews.length; i++) {
		const review = book.reviews[i];
		results = results.concat(await searchContent(review.text, SOURCES.REVIEW, review.id, review.url));
	};
	// Return rating object with all data
	book.cleanReads = {
		positive: results.filter(x => x.positive).length,
		negative: results.filter(x => !x.positive).length,
		rating: `${results.filter(x => x.positive).length}/${results.filter(x => !x.positive).length}`,
		data: results,
	};
	return book;
};

// Search content for positive/negative ratings
const searchContent = (content : string, source : number, href ?: string, url ?: string) => {
	const results : Array<any> = [];
	return new Promise<Array<any>>((resolve, reject) => {
		chrome.storage.local.get(['cleanreads_settings'], data => {
			data.cleanreads_settings.POSITIVE_SEARCH_TERMS.forEach((term : any) => {
				let contentMatch = matchTerm(term, source === SOURCES.SHELF ? content.replaceAll(/\W/g, ' ') : content);
				if (!!contentMatch) {
					const result = { 
                        term,
                        source,
                        content,
                        index: (<number>contentMatch?.index) + contentMatch[1].length + contentMatch[2].length,
                        positive: true,
                        matchHTML: ''
                    };
					result.matchHTML = matchHTML(contentMatch[3], content, result.index, data.cleanreads_settings.SNIPPET_HALF_LENGTH, true, source, href, url);
					results.push(result);
				}
			});

			data.cleanreads_settings.NEGATIVE_SEARCH_TERMS.forEach((term : any) => {
				let contentMatch = matchTerm(term, source === SOURCES.SHELF ? content.replaceAll(/\W/g, ' ') : content);
				if (!!contentMatch) {
					const result = {
                        term,
                        source,
                        content,
                        index: (<number>contentMatch?.index) + contentMatch[1].length + contentMatch[2].length,
                        positive: false,
                        matchHTML: ''
                    };
					result.matchHTML = matchHTML(contentMatch[3], content, result.index, data.cleanreads_settings.SNIPPET_HALF_LENGTH, false, source, href, url);
					results.push(result);
				}
			});
			resolve(results);
		});
	});
}

// Format result in HTML to show in details page
const matchHTML = (term : any, content : string, index : number, snippetLength : number, positive : boolean, source : number, href ?: string, url ?: string) => {
	let html = '<div class="contentComment">';
	switch(source) {
		case SOURCES.DESCRIPTION:
		case SOURCES.REVIEW:
			html += `...${content.slice(index - snippetLength, index)}<b class="content${positive ? '' : 'Not'}Clean">${
				content.substr(index, term.length)
			}</b>${content.slice(index + term.length, index + snippetLength)}...`
			break;
		case SOURCES.GENRE:
			html += `<b><a href=${url} class="content${positive ? '' : 'Not'}Clean">${content}</a></b>`
			break;
		case SOURCES.SHELF:
			html += `Shelved as <b class="content${positive ? '' : 'Not'}Clean">${content}</b>`
			break;
		default:
			break;
	}
	if (source !== SOURCES.DESCRIPTION && source != SOURCES.GENRE) {
		html += ` (<a href='#${href}'>jump to</a> / <a href='${url}'>view</a>)`;
	}
	return html;
}

// Match term against
const matchTerm = (term : any, content : string) => {
	const regex = new RegExp(`(^|[^(${term.exclude.before.join`|`}|\\s*)])(\\W*)(${term.term})(\\W*)($|[^(${term.exclude.after.join`|`}|\\s*)])`);
	return content.toLowerCase().match(regex);
}