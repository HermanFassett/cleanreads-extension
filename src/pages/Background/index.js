import { cleanReadRating, INITIAL_SETTINGS } from "../Common/cleanreads";
import { getBook, getGroupShelf, getList } from "./goodreads";

console.log('Cleanreads background service worker');

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
				getBook(bookId).then(book => {
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
	else if (request.method === 'get_group_shelf') {
		const shelfId = request.data;
		const key = `goodreads_group_shelf_${shelfId}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp || !data[key].title) {
				console.log('Loading fresh data for get_group_shelf', shelfId);
				getGroupShelf(shelfId).then(shelf => {
					console.log('Loaded data for get_group_shelf', shelfId);
					chrome.storage.local.set({ [key]: shelf });
					sendResponse(shelf);
				});
			}
			else {
				console.log('Used cache for get_group_shelf', shelfId);
				sendResponse(data[key]);
			}
		});
	}
	else if (request.method === 'get_list') {
		const listId = request.data;
		const key = `goodreads_list_${listId}`;
		chrome.storage.local.get([key], data => {
			if (!data[key] || !data[key].timestamp || !data[key].title) {
				console.log('Loading fresh data for get_list', listId);
				getList(listId).then(shelf => {
					console.log('Loaded data for get_list', listId);
					chrome.storage.local.set({ [key]: shelf });
					sendResponse(shelf);
				});
			}
			else {
				console.log('Used cache for get_list', listId);
				sendResponse(data[key]);
			}
		});
	}
	return true;
});