export interface Scraper {
	getBook(id: string): Promise<any>;
}