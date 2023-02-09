import * as cheerio from 'cheerio';
import { GoodreadsParser } from '../parsers/goodreadsParser';
import { Book } from '../types/book';
import { Bookshelf } from '../types/bookshelf';
import { Method } from '../types/method';
import { Scraper } from './baseScraper';

async function getGoodreadsTab(): Promise<number> {
	const tabs = await chrome.tabs.query({ url: '*://*.goodreads.com/*' });
	let tab: chrome.tabs.Tab;
	if (tabs.length === 0) {
		tab = await chrome.tabs.create({ url: 'https://goodreads.com', active: false });
	}
	else {
		tab = tabs[0];
	}
	return tab.id ?? -1;
}

async function addIframe(bookId: string) {
	const iframe = document.createElement("iframe");
	iframe.hidden = true;
	const loaded = new Promise(resolve => iframe.addEventListener('load', resolve));
	iframe.src = `https://www.goodreads.com/book/show/${bookId}`;
	document.body.appendChild(iframe);
	await loaded;
	const html = iframe.contentWindow?.document.body.innerHTML;
	document.body.removeChild(iframe);
	return html;
}

async function loadBookPage(bookId: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		const tabId = await getGoodreadsTab();
		chrome.scripting.executeScript({
			target: { tabId, allFrames: true },
			func: addIframe,
			args: [bookId],
		}).then(html => {
			if (html.length && html[0].result) {
				resolve(html[0].result);
			}
			else {
				reject("Failed to load book");
			}
		});
	});
}

export class GoodreadsV1Scraper implements Scraper {
	async getBook(id: string): Promise<any> {
		const html = await loadBookPage(id);
		return new GoodreadsParser().parseBookHTML(html);
	}

	async getShelf(id: string, page: number, title: string, books: Book[]): Promise<Bookshelf> {
		if (!page) page = 1;
		if (!books) books = [];
		const response = await fetch(`https://www.goodreads.com/shelf/show/${id}?page=${page}`);
		const html = await response.text();
		const $ = cheerio.load(html);
		const pageCount = Math.min(25, +$($($('.next_page').parent()).find('a:not(.next_page)').last()).text());
		const pageBooks: Book[] = $('.leftContainer .elementList div > a.leftAlignedImage').toArray().map(x => {
			return {
				id: ($(x).attr('href')?.match(/show\/(\d*)/) || [])[1],
				title: $(x).attr('title'),
				cover: $(x).find('img').attr('src'),
			};
		});
		chrome.runtime.sendMessage({ method: Method.LOADING_GENRE, data: { id, current: page, books: pageBooks, total: pageCount }});
		if (pageBooks.length && pageCount) {
			return await this.getShelf(id, ++page, $('.genreHeader').text().trim().slice(0, -6), books.concat(pageBooks));
		}
		else {
			return {
				timestamp: +(new Date()),
				id,
				shelf: '',
				books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
				title,
				current: page,
				total: page,
				description: '',
			};
		}
	}

	async getGroupShelf(id: string, shelf: string, page: number, books: Book[]): Promise<Bookshelf> {
		if (!page) page = 1;
		if (!books) books = [];
		const url = `https://www.goodreads.com/group/bookshelf/${id}?${shelf ? `shelf=${shelf}&` : ''}per_page=100&page=${page}&utf8=✓&view=covers`;
		const response = await fetch(url, { credentials: 'omit' });
		const html = await response.text();
		const $ = cheerio.load(html);
		const pageCount = +$($($('.next_page').parent()).find('a:not(.next_page)').last()).text();
		const pageBooks: Book[] = $('.rightContainer > div > a').toArray().map(x => {
			return {
				id: ($(x).attr('href')?.match(/show\/(\d*)/) || [])[1],
				title: $(x).attr('title') || $(x).find('img').attr('title'),
				cover: $(x).find('img').attr('src'),
			};
		});
		chrome.runtime.sendMessage({ method: Method.LOADING_GROUP_SHELF, data: { id, current: page, books: pageBooks, total: pageCount }});
		if (pageBooks.length) {
			return await this.getGroupShelf(id, shelf, ++page, books.concat(pageBooks));
		}
		else {
			const title = $('#pageHeader a').attr('title') ?? '';
			return {
				timestamp: +(new Date()),
				id,
				books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
				shelf,
				title,
			};
		}
	}

	async getUserShelf(id: string, shelf: string, page: number, books: Book[]): Promise<Bookshelf> {
		if (!page) page = 1;
		if (!books) books = [];
		const url = `https://www.goodreads.com/review/list/${id}?${shelf ? `shelf=${shelf}&` : ''}per_page=100&page=${page}&utf8=✓&view=covers`;
		const response = await fetch(url);
		const html = await response.text();
		const $ = cheerio.load(html);
		const pageCount = +$($($('.next_page').parent()).find('a:not(.next_page)').last()).text();
		const pageBooks: Book[] = $('.bookalike').toArray().map(x => {
			return {
				id: $(x).find('[data-resource-id]').data('resource-id') + '',
				title: $(x).find('.title .value a').attr('title'),
				cover: $(x).find('.cover img').attr('src'),
			};
		});
		chrome.runtime.sendMessage({ method: Method.LOADING_GROUP_SHELF, data: { id, current: page, books: pageBooks, total: pageCount }});
		if (pageBooks.length) {
			return await this.getUserShelf(id, shelf, ++page, books.concat(pageBooks));
		}
		else {
			return { 
				timestamp: +(new Date()), 
				id,
				books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
				shelf,
			};
		}
	}

	async getList(id: string, page: number, books: Book[]): Promise<Bookshelf> {
		if (!page) page = 1;
		if (!books) books = [];
		const response = await fetch(`https://www.goodreads.com/list/show/${id}?page=${page}`, { credentials: 'omit' });
		const html = await response.text();
		const $ = cheerio.load(html);
		const pageCount = +$($('.pagination a:not(.next_page)').last()).text();
		const pageBooks: Book[] = $('tr[itemtype="http://schema.org/Book"]').toArray().map(x => {
			return {
				id: $(x).find('div.u-anchorTarget').attr('id'),
				title: $(x).find('.bookTitle').text().trim(),
				cover: $(x).find('.bookCover').attr('src'),
			};
		});
		chrome.runtime.sendMessage({ method: Method.LOADING_LIST, data: { id, current: page, books: pageBooks, total: pageCount }});
		if (pageBooks.length) {
			return await this.getList(id, ++page, books.concat(pageBooks));
		}
		else {
			const title = $('.leftContainer h1').text();
			const description = $('.leftContainer .mediumText').text();
			return { 
				timestamp: +(new Date()),
				id,
				books: books.filter((x: Book, i: number, arr: Book[]) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
				title,
				current: page,
				total: page,
				description,
			};
		}
	}
}