import * as cheerio from 'cheerio';
import { Bookdata } from '../../types/bookdata';
import { Parser } from "../baseParser";

export class GoodreadsV2Parser implements Parser {
	parseBookHTML(html: string): Bookdata {
		const $ = cheerio.load(html, { xmlMode: true });
		const nextData = JSON.parse($("#__NEXT_DATA__").text());
		const apollo = nextData.props.pageProps.apolloState;
		const book: any = Object.values(apollo).find((x: any) => x.__typename === 'Book' && !!x.details);
		const work: any = apollo[book.work.__ref];
		const reviews: any = Object.values(apollo).filter((x: any) => x.__typename === 'Review');
		const authors: any = Object.values(apollo).filter((x: any) => x.__typename === 'Contributor' && !!x.name);

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
			series: book.bookSeries.map((x: any) => {
				const ref = apollo[x.series.__ref];
				return {
					name: ref.title,
					url: ref.webUrl,
					number: x.userPosition,
				}
			}),
			authors: authors.map((author: any) => {
				return {
					name: author.name,
					url: author.webUrl,
					goodreadsAuthor: author.isGrAuthor,
				}
			}),
			genres: book.bookGenres.map((genre: any) => {
				return {
					name: genre.genre.name,
					url: genre.genre.webUrl,
				}
			}),
			rating: {
				stars: work.stats.averageRating,
				ratings: work.stats.ratingsCount,
				reviews: work.stats.textReviewsCount,
			},
			cover: book.imageUrl,
			description: book['description({"stripped":true})'],
			descriptionHTML: book.description,
			reviews: reviews.filter((x: any) => x.shelving).map((review: any) => {
				const user = apollo[review.creator.__ref];
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
					user: { name: user.name, url: user.webUrl },
					date: review.createdAt,
					stars: review.rating,
				};
			}),
		};
		return bookData;
	}
}