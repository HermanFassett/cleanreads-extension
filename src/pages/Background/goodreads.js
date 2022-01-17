import * as cheerio from 'cheerio';


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
			}).filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i);
			bookData.genres = [...$('.bookPageGenreLink[href]')].map(genre => {
				return {
					name: $(genre).text(),
					url: $(genre).attr('href'),
				}
			}).filter((x, i, arr) => arr.findIndex(y => y.name === x.name) === i);
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
			resolve(bookData);
		}).catch(ex => reject(ex));
	});		
};