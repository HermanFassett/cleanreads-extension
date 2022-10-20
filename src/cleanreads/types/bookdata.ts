import { Author } from "./author";
import { Genre } from "./genre";
import { Rating } from "./rating";
import { Review } from "./review";
import { Series } from "./series";

export type Bookdata = {
	timestamp: number;
	id: string;
	title: string;
	originalTitle: string;
	isbn: string;
	isbn13: string;
	language: string;
	pages: number;
	format: string;
	published: string;
	publisher: string;
	series: Series[];
	authors: Author[];
	genres: Genre[];
	rating: Rating;
	cover?: string;
	description?: string;
	descriptionHTML: string | null;
	reviews: Review[];
}