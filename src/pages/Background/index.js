import { getBook } from "./goodreads";

console.log('Cleanreads background service worker');


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.method === 'get_book') {
		const bookId = request.data;
		chrome.storage.local.get([`goodreads_${bookId}`], data => {
			if (!data[`goodreads_${bookId}`] || !data[`goodreads_${bookId}`].timestamp || !data[`goodreads_${bookId}`].title) {
				console.log('Loading fresh data for get_book', bookId);
				getBook(bookId).then(book => {
					console.log('Loaded data for get_book', bookId);
					chrome.storage.local.set({ [`goodreads_${bookId}`]: book });
					sendResponse(book);
				});
			}
			else {
				console.log('Used cache for get_book', bookId);
				sendResponse(data[`goodreads_${bookId}`]);
			}
		});
	}
	return true;
});