import * as cheerio from 'cheerio';

// Rating sources
export const SOURCES = {
	DESCRIPTION: 0,
	SHELF: 1,
	REVIEW: 2,
}

// Scrape book data from goodreads website given (gr) book id
export const getBook = (id) => {
	const bookUrl = `https://www.goodreads.com/book/show/${id}`;
	return new Promise((resolve, reject) => {
		fetch(bookUrl).then(response => response.text()).then((html) => {
			const $ = cheerio.load(html);
			const bookData = { timestamp: +(new Date()) };
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
			bookData.series = [...$('#bookDataBox .clearFloats:contains("Series") .infoBoxRowItem a')].map(series => {
				const match = $(series).text().match(/(^.+) #([0-9]+)$/)
				return {
					name: match && match.length > 1 ? match[1] : $(series).text(),
					url: $(series).attr('href'),
					number: match && match.length > 2 ? +match[2] : -1
				}
			})
			bookData.authors = [...$('#bookAuthors .authorName')].map(author => {
				return {
					name: $(author).text(),
					url: $(author).attr('href'),
					goodreadsAuthor: $(author).parent().text().indexOf('(Goodreads Author)') > -1
				}
			}).filter((x, i, arr) => arr.findIndex(y => y.url = x.url) === i);
			bookData.rating = {
				stars: +$('#bookMeta [itemprop=ratingValue]').text().trim(),
				ratings: +$('#bookMeta [itemprop=ratingCount]').attr('content'),
				reviews: +$('#bookMeta [itemprop=reviewCount]').attr('content')
			}
			bookData.description = $('#descriptionContainer .readable span:last').text();
			bookData.descriptionHTML = $('#descriptionContainer .readable span:last').html();
			bookData.reviews = [...$('#reviews .review')].map(review => {
				const reviewData = {};
				reviewData.id = $(review).attr('id');
				reviewData.shelves = [...$(review).find('.bookshelves a')].map(x => { return { 'name': $(x).text(), 'url': $(x).attr('href') }});

				const span = $(review).find('.reviewText .readable span:last');
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
			cleanReadRating(bookData).then(result => resolve(result));
		}).catch(ex => reject(ex));
	});		
};

// Get Cleanread rating for given book
export const cleanReadRating = async (book) => {
	// Description
	let results = await searchContent(book.description, SOURCES.DESCRIPTION);
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
const searchContent = (content, source, href, url) => {
	const results = [];
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(['cleanreads_settings'], data => {
			data.cleanreads_settings.POSITIVE_SEARCH_TERMS.forEach(term => {
				let contentMatch = matchTerm(term, source === SOURCES.SHELF ? content.replaceAll(/\W/g, ' ') : content);
				if (!!contentMatch) {
					const result = { term: term, source: source, content: content, index: contentMatch.index + contentMatch[1].length + contentMatch[2].length, positive: true };
					result.matchHTML = matchHTML(contentMatch[3], content, result.index, data.cleanreads_settings.SNIPPET_HALF_LENGTH, true, source, href, url);
					results.push(result);
				}
			});

			data.cleanreads_settings.NEGATIVE_SEARCH_TERMS.forEach(term => {
				let contentMatch = matchTerm(term, source === SOURCES.SHELF ? content.replaceAll(/\W/g, ' ') : content);
				if (!!contentMatch) {
					const result = { term: term, source: source, content: content, index: contentMatch.index + contentMatch[1].length + contentMatch[2].length, positive: false };
					result.matchHTML = matchHTML(contentMatch[3], content, result.index, data.cleanreads_settings.SNIPPET_HALF_LENGTH, false, source, href, url);
					results.push(result);
				}
			});
			resolve(results);
		});
	});
}

// Format result in HTML to show in details page
const matchHTML = (term, content, index, snippetLength, positive, source, href, url) => {
	return `
		<div class="contentComment">
			${ source === SOURCES.SHELF ?
			`Shelved as <b class="content${positive ? '' : 'Not'}Clean">${content}</b>` :
			`...${content.slice(index - snippetLength, index)}<b class="content${positive ? '' : 'Not'}Clean">${
				content.substr(index, term.length)
			}</b>${content.slice(index + term.length, index + snippetLength)}...`}${source !== SOURCES.DESCRIPTION ? ` (<a href='#${href}'>jump to</a> / <a href='${url}'>view</a>)` : ''}
		</div>
	`
}

// Match term against
const matchTerm = (term, content) => {
	const regex = new RegExp(`(^|[^(${term.exclude.before.join`|`}|\\s*)])(\\W*)(${term.term})(\\W*)($|[^(${term.exclude.after.join`|`}|\\s*)])`);
	return content.toLowerCase().match(regex);
}