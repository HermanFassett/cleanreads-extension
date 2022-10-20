import { cleanReadRating } from "../../cleanreads/cleanreads";
import { INITIAL_SETTINGS } from "../../cleanreads/constants";
import { GoodreadsV1Scraper } from "../../cleanreads/scrapers/goodreadsV1Scraper";

console.log('Cleanreads background service worker');

const scraper = new GoodreadsV1Scraper();

chrome.runtime.onInstalled.addListener(() => {
	console.log("Installed")
	chrome.storage.local.get(['cleanreads_settings'], (data) => {
		if (!data.cleanreads_settings) {
			chrome.storage.local.set({ 'cleanreads_settings': INITIAL_SETTINGS });
		} 
	});
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.method === 'get_book') {
		const bookId = request.data;
		chrome.storage.local.get([`goodreads_${bookId}`], data => {
			if (!data[`goodreads_${bookId}`] || !data[`goodreads_${bookId}`].timestamp || !data[`goodreads_${bookId}`].title) {
				console.log('Loading fresh data for get_book', bookId);
				scraper.getBook(bookId).then(book => {
					console.log('Loaded data for get_book', bookId);
					chrome.storage.local.set({ [`goodreads_${bookId}`]: book });
					cleanReadRating(book).then(response => sendResponse(response));
				});
			}
			else {
				console.log('Used cache for get_book', bookId);
				cleanReadRating(data[`goodreads_${bookId}`]).then(response => sendResponse(response));
			}
		});
	}
	else if (request.method === 'get_shelf') {
		const shelfId = request.data.id;
		const key = `goodreads_shelf_${shelfId}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp || !data[key].title) {
				console.log('Loading fresh data for get_shelf', shelfId);
				scraper.getShelf(shelfId).then(shelf => {
					console.log('Loaded data for get_shelf', shelfId);
					chrome.storage.local.set({ [key]: shelf });
					sendResponse({ cache: false, data: shelf });
				});
			}
			else {
				console.log('Used cache for get_shelf', shelfId);
				sendResponse({ cache: true, data: data[key] });
			}
		});
	}
	else if (request.method === 'get_group_shelf') {
		const groupId = request.data.id;
		const shelf = request.data.shelf;
		const key = `goodreads_group_shelf_${groupId}_${shelf}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp || !data[key].title) {
				console.log('Loading fresh data for get_group_shelf', groupId, shelf);
				scraper.getGroupShelf(groupId, shelf).then(result => {
					console.log('Loaded data for get_group_shelf', groupId, shelf);
					chrome.storage.local.set({ [key]: result });
					sendResponse({ cache: false, data: result });
				});
			}
			else {
				console.log('Used cache for get_group_shelf', groupId, shelf);
				sendResponse({ cache: true, data: data[key] });
			}
		});
	}
	else if (request.method === 'get_user_shelf') {
		const userId = request.data.id;
		const shelf = request.data.shelf;
		const key = `goodreads_user_shelf_${userId}_${shelf}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp) {
				console.log('Loading fresh data for get_user_shelf', userId, shelf);
				scraper.getUserShelf(userId, shelf).then(result => {
					console.log('Loaded data for get_user_shelf', userId, shelf);
					chrome.storage.local.set({ [key]: result });
					console.log(key, result);
					sendResponse({ cache: false, data: result });
				});
			}
			else {
				console.log('Used cache for get_user_shelf', userId, shelf);
				sendResponse({ cache: true, data: data[key] });
			}
		});
	}
	else if (request.method === 'get_list') {
		const listId = request.data.id;
		const key = `goodreads_list_${listId}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp || !data[key].title) {
				console.log('Loading fresh data for get_list', listId);
				scraper.getList(listId).then(shelf => {
					console.log('Loaded data for get_list', listId);
					chrome.storage.local.set({ [key]: shelf });
					sendResponse({ cache: false, data: shelf });
				});
			}
			else {
				console.log('Used cache for get_list', listId);
				sendResponse({ cache: true, data: data[key] });
			}
		});
	}
	return true;
});