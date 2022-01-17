import { cleanReadRating, SOURCES } from "../Common/cleanreads";

chrome.storage.local.get(['cleanreads_settings'], data => {
	if (data.cleanreads_settings.ENABLED) {
		let currentId;
		
		console.log('Loading Cleanreads');
		if (document.location.href.match('goodreads.com/book/show')) {
			currentId = document.location.href.match(/show\/(\d*)/)[1];
		}
		else if (!document.location.href.match('goodreads.com')) {
			return;
		}

		// Show load button / directly load ratings for book tables
		[...document.querySelectorAll('tr[itemtype="http://schema.org/Book"]')].forEach(book => {
			const bookId = book.querySelector('a').href.match(/show\/(\d*)/)[1];

			const td = document.createElement('td', { width: "100px" });
			const label = document.createElement('div', { class: 'uitext greyText' });
			label.innerText = 'Cleanreads';
			td.appendChild(label);

			function setRating(response, target) {
				const {positive, negative, percent} = getRating(response.cleanReads);
				console.log('Cleanreads rating:', positive, 'positive,', negative, 'negative,', percent + '%');

				if (percent !== null) {
					target.outerHTML = `<div class='progress-pie-color' data-value='${percent}'></div>`;
				} else {
					target.outerHTML = `<span class='u-defaultType'>No rating</span>`
				}
			}
			
			if (data.cleanreads_settings.CLEAN_BOOKS.indexOf(bookId) > -1) {
				const div = document.createElement('div');
				td.appendChild(div);
				setRating({ cleanReads: { cleanRead: true, positive: 0, negative: 0 }}, div);
				book.appendChild(td);
			}
			else {
				chrome.storage.local.get([`goodreads_${bookId}`], cache => {
					const data = cache[`goodreads_${bookId}`];
					if (!data || !data.timestamp || !data.title) {
						const button = document.createElement('button');
						button.className = 'gr-button';
						button.innerText = 'Load';
						button.onclick = function(e) {
							e.target.disabled = true;
							e.target.innerText = 'Loading...';
							chrome.runtime.sendMessage({method: "get_book", data: bookId }, (response) => {
								setRating(response, e.target);
							});
						}
						td.appendChild(button);
					}
					else {
						const div = document.createElement('div');
						td.appendChild(div);
						cleanReadRating(data).then(response => setRating(response, div));
					}
					book.appendChild(td);
				});
			}
		});

		// Load full rating on book page
		if (!!document.querySelector('#bookTitle')) {
			const container = document.createElement('div');
			container.id = 'cleanReadsRating';
			container.className = 'u-bottomGrayBorder';
			container.innerHTML = `
				<h2 class='gr-h1 u-bottomGrayBorder' style='text-align:center'>Cleanreads Rating</h2>
				<h2 class='uitext greyText' style='text-align:center'>Loading...</h2>`;
			document.querySelector('.rightContainer').prepend(container);

			chrome.runtime.sendMessage({method: "get_book", data: currentId }, (response) => {
				console.log(response);
				const {positive, negative, percent} = getRating(response.cleanReads);
				const container = document.querySelector('#cleanReadsRating');

				container.innerHTML = `
					<h2 class='gr-h1 u-bottomGrayBorder' style='text-align:center'>Cleanreads Rating</h2>
					${ percent !== null ?
						`<div class='progress-pie-color large center' data-value='${percent}'></div>` :
						`<h2 class='uitext greyText' style='text-align:center'>No rating</h2>`
					}
				`;

				if (response.cleanReads.cleanRead) {
					container.innerHTML += '<h2 class="uitext contentClean">Found in Clean Book List</h2>'
				}

				let lastSource = -1;
				response.cleanReads.data.sort((a, b) => a.source - b.source || b.positive - a.positive).forEach(res => {
					if (lastSource !== res.source) {
						switch(res.source) {
							case SOURCES.DESCRIPTION:
								container.innerHTML += '<h2 class="uitext greyText">Description:</h2>';
								break;
							case SOURCES.GENRE:
								container.innerHTML += '<h2 class="uitext greyText">Genres:</h2>';
								break;
							case SOURCES.SHELF:
								container.innerHTML += '<h2 class="uitext greyText">Shelves:</h2>';
								break;
							case SOURCES.REVIEW:
								container.innerHTML += '<h2 class="uitext greyText">Reviews:</h2>';
								break;
							default:
								break;
						}
					}
					container.innerHTML += res.matchHTML;
					lastSource = res.source;
				})
			});
		}
	}
});

// Get positives, negatives, and percent of rating
function getRating(cleanReads) {
	const positive = cleanReads ? cleanReads.positive : 0;
	const negative = cleanReads ? cleanReads.negative : 0;
	let percent = 0;
	if (cleanReads.cleanRead) {
		percent = 100;
	}
	else if (negative === 0 && positive === 0) {
		percent = null;
	}
	else {
		percent = negative > 0 ? Math.min(100, Math.round(positive / (positive + negative) * 100)) : 100
	}
	return { positive, negative, percent };
}