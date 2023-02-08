import * as cheerio from 'cheerio';
import { Bookdata } from '../../types/bookdata';
import { Parser } from "../baseParser";

export class GoodreadsV1Parser implements Parser {
	parseBookHTML(html: string): Bookdata {
		const $ = cheerio.load(html);
		const publishMatch = $("#details div.row:eq(1)").text().replaceAll('\n', '').match(/Published (.+) by (.+)/);
		const bookData: Bookdata = { 
			timestamp: +(new Date()),
			id: ($('[data-book-id]').data('book-id') as string).toString(),
			title: $('#bookTitle').text().trim(),
			originalTitle: $('#bookDataBox .clearFloats:contains("Original Title") .infoBoxRowItem').text(),
			isbn: $('#bookDataBox .clearFloats:contains("ISBN") .infoBoxRowItem').text().trim().split('\n')[0],
			isbn13: ($('#bookDataBox .clearFloats:contains("ISBN13") .infoBoxRowItem').text().match(/ISBN13: ([0-9]+)/) || ['', ''])[1],
			language: $('#bookDataBox .clearFloats:contains("Language") .infoBoxRowItem').text(),
			pages: parseInt($('#details [itemprop=numberOfPages]').text()),
			format: $('#details [itemprop=bookFormat]').text(),
			published: publishMatch && publishMatch.length > 1 ? publishMatch[1].trim() : $("#details div.row:eq(1)").text(),
			publisher: publishMatch && publishMatch.length > 2 ? publishMatch[2].trim() : '',
			series: $('#bookDataBox .clearFloats:contains("Series") .infoBoxRowItem a').toArray().map(series => {
			const match = $(series).text().match(/(^.+) #([0-9]+)$/)
				return {
					name: match && match.length > 1 ? match[1] : $(series).text(),
					url: $(series).attr('href'),
					number: match && match.length > 2 ? +match[2] : -1
				}
			}),
			authors: $('#bookAuthors .authorName').toArray().map(author => {
				return {
					name: $(author).text(),
					url: $(author).attr('href'),
					goodreadsAuthor: $(author).parent().text().indexOf('(Goodreads Author)') > -1
				}
			}).filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i),
			genres: $('.bookPageGenreLink[href]').toArray().map(genre => {
				return {
					name: $(genre).text(),
					url: $(genre).attr('href'),
				}
			}).filter((x, i, arr) => arr.findIndex(y => y.name === x.name) === i),
			rating: {
				stars: +$('#bookMeta [itemprop=ratingValue]').text().trim(),
				ratings: +($('#bookMeta [itemprop=ratingCount]').attr('content') as string),
				reviews: +($('#bookMeta [itemprop=reviewCount]').attr('content') as string)
			},
			cover: $('#coverImage').attr('src'),
			description: $('#descriptionContainer .readable span:last-of-type').text(),
			descriptionHTML: $('#descriptionContainer .readable span:last-of-type').html(),
			reviews: $('.review').toArray().map(review => {
				const reviewData: any = {};
				reviewData.id = $(review).attr('id');
				reviewData.shelves = $(review).find('.bookshelves a').toArray().map(x => {
					return { 
						'name': $(x).text(),
						'url': $(x).attr('href')
					}
				});

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
			}),
		};
		return bookData;
	}
}