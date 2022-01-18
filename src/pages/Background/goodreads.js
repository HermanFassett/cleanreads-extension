import * as cheerio from 'cheerio';
import { parseBookHTML } from '../Common/cleanreads';


// Scrape book data from goodreads website given (gr) book id
export const getBook = async (id) => {
	const response = await fetch(`https://www.goodreads.com/book/show/${id}`, { credentials: 'omit' });
	const html = await response.text();
	return await parseBookHTML(html);
};

// Scrape all books from list
export const getGenre = async (id, page, books) => {
	if (!page) page = 1;
	if (!books) books = [];
	const response = await fetch(`https://www.goodreads.com/shelf/show/${id}?page=${page}`);
	const html = await response.text();
	const $ = cheerio.load(html);
	const pageCount = Math.min(25, +$([...$($('.next_page').parent()).find('a:not(.next_page)')].pop()).text());
	const pageBooks = $('.leftContainer .elementList div > a.leftAlignedImage').toArray().map(x => {
		return {
			id: ($(x).attr('href').match(/show\/(\d*)/) || [])[1],
			title: $(x).attr('title'),
			cover: $(x).find('img').attr('src'),
		};
	});
	chrome.runtime.sendMessage({ method: 'loading_genre', data: { id, current: page, books: pageBooks, total: pageCount }});
	if (pageBooks.length && pageCount) {
		return await getGenre(id, ++page, books.concat(pageBooks));
	}
	else {
		const title = $('.genreHeader').text().slice(0, -6);
		return { 
			timestamp: +(new Date()),
			id,
			books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
			title,
			current: page,
			total: page,
		};
	}
};

// Scrape all books from group shelf
export const getGroupShelf = async (id, page, books) => {
	if (!page) page = 1;
	if (!books) books = [];
	const response = await fetch(`https://www.goodreads.com/group/bookshelf/${id}?per_page=100&page=${page}&utf8=✓&view=covers`, { credentials: 'omit' });
	const html = await response.text();
	const $ = cheerio.load(html);
	const pageCount = +$([...$($('.next_page').parent()).find('a:not(.next_page)')].pop()).text();
	const pageBooks = $('.rightContainer > div > a').toArray().map(x => {
		return {
			id: ($(x).attr('href').match(/show\/(\d*)/) || [])[1],
			title: $(x).attr('title') || $(x).find('img').attr('title'),
			cover: $(x).find('img').attr('src'),
		}
	});
	chrome.runtime.sendMessage({ method: 'loading_group_shelf', data: { id, current: page, books: pageBooks, total: pageCount }});
	if (pageBooks.length) {
		return await getGroupShelf(id, ++page, books.concat(pageBooks));
	}
	else {
		const title = $('#pageHeader a').attr('title');
		return { timestamp: +(new Date()), id, books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i), title };
	}
};

// Scrape all books from list
export const getList = async (id, page, books) => {
	if (!page) page = 1;
	if (!books) books = [];
	const response = await fetch(`https://www.goodreads.com/list/show/${id}?page=${page}`, { credentials: 'omit' });
	const html = await response.text();
	const $ = cheerio.load(html);
	const pageCount = +$([...$('.pagination a:not(.next_page)')].pop()).text();
	const pageBooks = $('tr[itemtype="http://schema.org/Book"]').toArray().map(x => {
		return {
			id: $(x).find('div.u-anchorTarget').attr('id'),
			title: $(x).find('.bookTitle').text().trim(),
			cover: $(x).find('.bookCover').attr('src'),
		};
	});
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
			books: books.filter((x, i, arr) => x && x.title && arr.findIndex(y => y.id === x.id) === i),
			title,
			current: page,
			total: page,
			description,
		};
	}
};