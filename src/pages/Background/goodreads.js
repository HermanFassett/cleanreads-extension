import * as cheerio from 'cheerio';
import { parseBookHTML } from '../Common/cleanreads';


// Scrape book data from goodreads website given (gr) book id
export const getBook = async (id) => {
	const response = await fetch(`https://www.goodreads.com/book/show/${id}`);
	const html = await response.text();
	return await parseBookHTML(html);
};

// Scrape all books from group shelf
export const getGroupShelf = async (id, page, books) => {
	if (!page) page = 1;
	if (!books) books = [];
	const response = await fetch(`https://www.goodreads.com/group/bookshelf/${id}?per_page=100&page=${page}&utf8=✓&view=covers`);
	const html = await response.text();
	const $ = cheerio.load(html);
	const pageCount = +$([...$($('.next_page').parent()).find('a:not(.next_page)')].pop()).text();
	const pageBooks = $('.rightContainer div > a').toArray().map(x => ($(x).attr('href').match(/show\/(\d*)/) || [])[1]);
	chrome.runtime.sendMessage({ method: 'loading_group_shelf', data: { id, current: page, books: pageBooks, total: pageCount }});
	if (pageBooks.length) {
		return await getGroupShelf(id, ++page, books.concat(pageBooks));
	}
	else {
		const title = $('#pageHeader a').attr('title');
		return { timestamp: +(new Date()), id, books: books.filter((x, i, arr) => x && arr.indexOf(x) === i), title };
	}
};

// Scrape all books from list
export const getList = async (id, page, books) => {
	if (!page) page = 1;
	if (!books) books = [];
	const response = await fetch(`https://www.goodreads.com/list/show/${id}?page=${page}`);
	const html = await response.text();
	const $ = cheerio.load(html);
	const pageCount = +$([...$('.pagination a:not(.next_page)')].pop()).text();
	const pageBooks = $('tr[itemtype="http://schema.org/Book"] div.u-anchorTarget').toArray().map(x => $(x).attr('id'));
	chrome.runtime.sendMessage({ method: 'loading_list', data: { id, current: page, books: pageBooks, total: pageCount }});
	if (pageBooks.length) {
		return await getList(id, ++page, books.concat(pageBooks));
	}
	else {
		const title = $('.leftContainer h1').text();
		const description = $('.leftContainer .mediumText').text();
		return { 
			timestamp: +(new Date()),
			id,
			books: books.filter((x, i, arr) => x && arr.indexOf(x) === i),
			title,
			current: page,
			total: page,
			description,
		};
	}
};