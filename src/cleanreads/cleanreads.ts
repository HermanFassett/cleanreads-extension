import {createChromeStorageStateHookLocal} from 'use-chrome-storage';
import * as cheerio from 'cheerio';
import { INITIAL_SETTINGS, SOURCES } from './constants';

export const useSettings = createChromeStorageStateHookLocal('cleanreads_settings', INITIAL_SETTINGS);

// Get Cleanread rating for given book
export const cleanReadRating = async (book: any) => {
    // Load settings
    const data = await chrome.storage.local.get(['cleanreads_settings']);
    const settings = data.cleanreads_settings;

	// Description
	let results : Array<any> = searchContent(book.description, SOURCES.DESCRIPTION, settings);
	for (let i = 0; i < book.genres.length; i++) {
		const genre = book.genres[i];
		results = results.concat(searchContent(genre.name, SOURCES.GENRE, settings, undefined, genre.url))
	}
	// Shelves
	for (let i = 0; i < book.reviews.length; i++) {
		const review = book.reviews[i];
		for (let j = 0; j < review.shelves.length; j++) {
			const shelf = review.shelves[j];
			results = results.concat(searchContent(shelf.name, SOURCES.SHELF, settings, review.id, review.url));
		}
	};
	// Reviews
	for (let i = 0; i < book.reviews.length; i++) {
		const review = book.reviews[i];
		results = results.concat(searchContent(review.text, SOURCES.REVIEW, settings, review.id, review.url));
	};
	// Return rating object with all data
	book.cleanReads = {
        cleanRead: settings.CLEAN_BOOKS.findIndex((x: any) => x.id === book.id) > -1,
		positive: results.filter(x => x.positive).length,
		negative: results.filter(x => !x.positive).length,
		rating: `${results.filter(x => x.positive).length}/${results.filter(x => !x.positive).length}`,
		data: results,
	};
	return book;
};

// Search content for positive/negative ratings
const searchContent = (content : string, source : number, settings : any, href ?: string, url ?: string) => {
    const results : Array<any> = [];
    settings.POSITIVE_SEARCH_TERMS.forEach((term : any) => {
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
            result.matchHTML = matchHTML(contentMatch[3], content, result.index, settings.SNIPPET_HALF_LENGTH, true, source, href, url);
            results.push(result);
        }
    });

    settings.NEGATIVE_SEARCH_TERMS.forEach((term : any) => {
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
            result.matchHTML = matchHTML(contentMatch[3], content, result.index, settings.SNIPPET_HALF_LENGTH, false, source, href, url);
            results.push(result);
        }
    });
    return results;
}

// Format result in HTML to show in details page
const matchHTML = (term : any, content : string, index : number, snippetLength : number, positive : boolean, source : number, href ?: string, url ?: string) => {
	let html = '<div class="contentComment">';
	switch(source) {
		case SOURCES.DESCRIPTION:
		case SOURCES.REVIEW:
			html += `...${content.slice(Math.max(0, index - snippetLength), index)}<b class="content${positive ? '' : 'Not'}Clean">${
				content.slice(index, index + term.length)
			}</b>${content.slice(index + term.length, index + term.length + snippetLength)}...`
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
		html += ` (<a href='${url}'>view</a>)`;
	}
	return html;
}

// Match term against
const matchTerm = (term : any, content : string) => {
	if (!term.term) return;
	const regex = new RegExp(`(^|[^(${term.exclude.before.join`|`}|\\s*)])(\\W*)(${term.term})(\\W*)($|[^(${term.exclude.after.join`|`}|\\s*)])`);
	return content.toLowerCase().match(regex);
}