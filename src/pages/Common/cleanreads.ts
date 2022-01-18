import {createChromeStorageStateHookLocal} from 'use-chrome-storage';
import * as cheerio from 'cheerio';

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
        { term: 'young adult', exclude: { before: [], after: [] }},
		{ term: 'no explicit', exclude: { before: [], after: [] }},
    ],
    NEGATIVE_SEARCH_TERMS: [
        { term: 'sex', exclude: { before: ['no'], after: ['ist'] }},
        { term: 'adult', exclude: { before: ['young', 'new'], after: ['hood', 'ing']}},
        { term: 'erotic', exclude: { before: ['not', 'isn\'t'], after: []}},
		{ term: 'explicit', exclude: { before: ['no', 'not', 'isn\'t'], after: ['ly']}},
    ],
    SNIPPET_HALF_LENGTH: 65,
    ENABLED: true,
    CLEAN_BOOKS: [],
}

export const useSettings = createChromeStorageStateHookLocal('cleanreads_settings', INITIAL_SETTINGS);

export const parseBookHTML = async (html: string) => {
	const $ = cheerio.load(html);
	const bookData:any = { timestamp: +(new Date()), id: ($('[data-book-id]').data('book-id') as string).toString() };
	bookData.title = $('#bookTitle').text().trim();
	bookData.originalTitle = $('#bookDataBox .clearFloats:contains("Original Title") .infoBoxRowItem').text();
	bookData.isbn = $('#bookDataBox .clearFloats:contains("ISBN") .infoBoxRowItem').text().trim().split('\n')[0];
	bookData.isbn13 = ($('#bookDataBox .clearFloats:contains("ISBN13") .infoBoxRowItem').text().match(/ISBN13: ([0-9]+)/) || ['',''])[1];
	bookData.language = $('#bookDataBox .clearFloats:contains("Language") .infoBoxRowItem').text();
	bookData.pages = parseInt($('#details [itemprop=numberOfPages]').text());
	bookData.format = $('#details [itemprop=bookFormat]').text();
	const publishMatch = $("#details div.row:eq(1)").text().replaceAll('\n', '').match(/Published (.+) by (.+)/);
	bookData.published = publishMatch && publishMatch.length > 1 ? publishMatch[1].trim() : $("#details div.row:eq(1)").text();
	bookData.publisher = publishMatch && publishMatch.length > 2 ? publishMatch[2].trim() : '';
	bookData.series = $('#bookDataBox .clearFloats:contains("Series") .infoBoxRowItem a').toArray().map(series => {
		const match = $(series).text().match(/(^.+) #([0-9]+)$/)
		return {
			name: match && match.length > 1 ? match[1] : $(series).text(),
			url: $(series).attr('href'),
			number: match && match.length > 2 ? +match[2] : -1
		}
	})
	bookData.authors = $('#bookAuthors .authorName').toArray().map(author => {
		return {
			name: $(author).text(),
			url: $(author).attr('href'),
			goodreadsAuthor: $(author).parent().text().indexOf('(Goodreads Author)') > -1
		}
	}).filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i);
	bookData.genres = $('.bookPageGenreLink[href]').toArray().map(genre => {
		return {
			name: $(genre).text(),
			url: $(genre).attr('href'),
		}
	}).filter((x, i, arr) => arr.findIndex(y => y.name === x.name) === i);
	bookData.rating = {
		stars: +$('#bookMeta [itemprop=ratingValue]').text().trim(),
		ratings: +($('#bookMeta [itemprop=ratingCount]').attr('content') as string),
		reviews: +($('#bookMeta [itemprop=reviewCount]').attr('content') as string)
	}
	bookData.description = $('#descriptionContainer .readable span:last-of-type').text();
	bookData.descriptionHTML = $('#descriptionContainer .readable span:last-of-type').html();
	bookData.reviews = $('.review').toArray().map(review => {
		const reviewData:any = {};
		reviewData.id = $(review).attr('id');
		reviewData.shelves = $(review).find('.bookshelves a').toArray().map(x => { return { 'name': $(x).text(), 'url': $(x).attr('href') }});

		const span = $(review).find('.reviewText .readable span:last-of-type');
		reviewData.text = span.text().trim();
		reviewData.url = $(review).find('link').attr('href');
		reviewData.user = {
			name: $(review).find('.user').attr('name'),
			url: $(review).find('.user').attr('href')
		};
		reviewData.date = new Date($(review).find('.reviewDate').text());
		reviewData.stars = $(review).find('.staticStar.p10').length;
		return reviewData;
	});
	return bookData;
}

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
        cleanRead: settings.CLEAN_BOOKS.indexOf(book.id) > -1,
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
		html += ` (<a href='#${href}'>jump to</a> / <a href='${url}'>view</a>)`;
	}
	return html;
}

// Match term against
const matchTerm = (term : any, content : string) => {
	const regex = new RegExp(`(^|[^(${term.exclude.before.join`|`}|\\s*)])(\\W*)(${term.term})(\\W*)($|[^(${term.exclude.after.join`|`}|\\s*)])`);
	return content.toLowerCase().match(regex);
}