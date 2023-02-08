import * as cheerio from 'cheerio';
import { Bookdata } from '../../types/bookdata';
import { Parser } from "../baseParser";

export class GoodreadsV2Parser implements Parser {
	parseBookHTML(html: string): Bookdata {
		const $ = cheerio.load(html, { xmlMode: true });
		const nextData = JSON.parse($("#__NEXT_DATA__").text());
		const apollo = nextData.props.pageProps.apolloState;
		console.log(apollo);
		const book = Object.keys(apollo).filter(x => x.indexOf('Book:') == 0)
			.map(x => apollo[x])
			.find(x => !!x.details);
		const work = apollo[Object.keys(apollo).find(x => x.indexOf('Work:') == 0) ?? 0];
		const reviews = Object.keys(apollo).filter(x => x.indexOf('Review:') == 0).map(x => apollo[x]);

		const bookData: Bookdata = { 
			timestamp: +(new Date()),
			id: book.legacyId.toString(),
			title: book.title,
			originalTitle: work.details.originalTitle,
			isbn: book.details.isbn,
			isbn13: book.details.isbn13,
			language: book.details.language.name,
			pages: book.details.numPages,
			format: book.details.format,
			published: book.details.publicationTime,
			publisher: book.details.publisher,
			series: [] ?? $('#bookDataBox .clearFloats:contains("Series") .infoBoxRowItem a').toArray().map(series => {
			const match = $(series).text().match(/(^.+) #([0-9]+)$/)
				return {
					name: match && match.length > 1 ? match[1] : $(series).text(),
					url: $(series).attr('href'),
					number: match && match.length > 2 ? +match[2] : -1
				}
			}),
			authors: [] ?? $('#bookAuthors .authorName').toArray().map(author => {
				return {
					name: $(author).text(),
					url: $(author).attr('href'),
					goodreadsAuthor: $(author).parent().text().indexOf('(Goodreads Author)') > -1
				}
			}).filter((x, i, arr) => arr.findIndex(y => y.url === x.url) === i),
			genres: book.bookGenres.map((genre: any) => {
				return {
					name: genre.genre.name,
					url: genre.genre.webUrl,
				}
			}), //.filter((x, i, arr) => arr.findIndex(y => y.name === x.name) === i),
			rating: {
				stars: work.stats.averageRating,
				ratings: work.stats.ratingsCount,
				reviews: work.stats.textReviewsCount,
			},
			cover: book.imageUrl,
			description: book['description({"stripped":true})'],
			descriptionHTML: book.description,
			reviews: reviews.filter(x => x.shelving).map((review: any) => {
				return {
					id: review.id,
					shelves: review.shelving.taggings.map((tag: any) => {
						return {
							name: tag.tag.name,
							url: tag.tag.webUrl,
						}
					}),
					text: review.text,
					url: review.shelving.webUrl,
					user: { name: 'hi', url: '' },
					date: review.createdAt,
					stars: review.rating,
				};
			}),
		};
		console.log(bookData);
		return bookData;
	}
}