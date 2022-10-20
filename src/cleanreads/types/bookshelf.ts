import { Book } from "./book";

export type Bookshelf = {
	timestamp: number;
	id: string;
	books: Book[];
	shelf?: string;
	title?: string;
	current?: number;
	total?: number;
	description?: string;
}