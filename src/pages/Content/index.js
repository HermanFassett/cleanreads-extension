import { cleanReadRating, parseBookHTML, SOURCES } from "../Common/cleanreads";
import Plotly from 'plotly.js-dist-min';

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
		[...document.querySelectorAll('tr[itemtype="http://schema.org/Book"], .leftContainer .elementList')].forEach(book => {
			const match = book.querySelector('a').href.match(/book\/show\/(\d*)/);
			if (!match) return;

			const bookId = match[1];
			const shelf = book.querySelector('.right');
			if (shelf) {
				book.querySelector('.left').style.width = '65%';
				book = book.querySelector('.right');
				book.children[0].style.float = 'left';
				book.children[0].style.margin = '0 10px 0 0';
			}

			const td = document.createElement('td', { width: '100px', class: 'uirating' });
			if (shelf) {
				td.style.float = 'right';
			}
			const label = document.createElement('div', { class: 'uitext greyText' });
			label.innerText = 'Cleanreads';
			td.appendChild(label);

			function setRating(response, target) {
				const {positive, negative, percent} = getRating(response.cleanReads);

				if (percent !== null) {
					target.outerHTML = `<div id="gd_${bookId}" class='crPieChart'></div>`;
				} else {
					target.outerHTML = `<span class='u-defaultType'>No rating</span>`
				}
				return { positive, negative, percent };
			}
			
			if (data.cleanreads_settings.CLEAN_BOOKS.findIndex(x => x.id === bookId) > -1) {
				const div = document.createElement('div');
				td.appendChild(div);
				const { positive, negative, percent } = setRating({ cleanReads: { cleanRead: true, positive: 0, negative: 0 }}, div);
				book.appendChild(td);
				loadChart(bookId, 60, positive, negative, percent);
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
							chrome.runtime.sendMessage({method: "get_book", data: bookId }, (response) => {
								const { positive, negative, percent } = setRating(response, e.target);
								loadChart(bookId, 60, positive, negative, percent);
							});
						}
						td.appendChild(button);
					}
					else {
						const div = document.createElement('div');
						td.appendChild(div);
						cleanReadRating(data).then(response => {
							const {positive, negative, percent } = setRating(response, div);
							loadChart(bookId, 60, positive, negative, percent);
						});
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
				let attempts = 10;

				if (response.rating.reviews > 0 && response.reviews.length === 0) {
					loadLocalHTML();
				}
				else {
					loadRating(response);
				}

				async function loadLocalHTML() {
					let book = await parseBookHTML(document.body.innerHTML);
					if (!book.reviews.length && attempts--) {
						setTimeout(loadLocalHTML, 1000);
					}
					else {
						chrome.storage.local.set({[`goodreads_${book.id}`]: book });
						loadRating(await cleanReadRating(book));
					}
				}
			});
		}
	}
});

function loadRating(book) {
	console.log(book);
	const {positive, negative, percent} = getRating(book.cleanReads);
	const container = document.querySelector('#cleanReadsRating');

	container.innerHTML = `
		<h2 class='gr-h1 u-bottomGrayBorder' style='text-align:center'>Cleanreads Rating</h2>
		${ percent !== null ?
			`<div id="gd_${book.id}" class='crPieChart'></div>` :
			`<h2 class='uitext greyText' style='text-align:center'>No rating</h2>`
		}
	`;

	if (percent !== null) {
		loadChart(book.id, 90, positive, negative, percent, true);
	}

	if (book.cleanReads.cleanRead) {
		container.innerHTML += '<h2 class="uitext contentClean">Found in Clean Book List</h2>'
	}

	let lastSource = -1;
	book.cleanReads.data.sort((a, b) => a.source - b.source || b.positive - a.positive).forEach(res => {
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
	});

	const cleanButton = document.createElement('button');
	cleanButton.className = 'gr-button';
	cleanButton.innerText = book.cleanReads.cleanRead ? 'Remove From Clean List' : 'Add To Clean List';
	cleanButton.style.marginBottom = '15px';
	cleanButton.onclick = async function(e) {
		e.target.disabled = true;
		const data = await chrome.storage.local.get(['cleanreads_settings']);
		if (book.cleanReads.cleanRead) {
			data.cleanreads_settings.CLEAN_BOOKS = data.cleanreads_settings.CLEAN_BOOKS.filter(x => x.id !== book.id);
			e.target.innerText = 'Add To Clean List';

		}
		else {
			data.cleanreads_settings.CLEAN_BOOKS = data.cleanreads_settings.CLEAN_BOOKS
				.concat([{
					id: book.id,
					title: book.title,
					cover: book.cover,
				}]).sort((a, b) => a.title.localeCompare(b.title));
			e.target.innerText = 'Remove From Clean List';
		}
		
		await chrome.storage.local.set({ 'cleanreads_settings': data.cleanreads_settings });
		e.target.disabled = false;
		book.cleanReads.cleanRead = !book.cleanReads.cleanRead;
		loadRating(book);
	}
	container.append(cleanButton);
}

// Get positives, negatives, and percent of rating
function getRating(cleanReads) {
	let positive = cleanReads ? cleanReads.positive : 0;
	const negative = cleanReads ? cleanReads.negative : 0;
	let percent = 0;
	if (cleanReads.cleanRead) {
		positive++;
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


function loadChart(id, size, positive, negative, percent) {
	Plotly.newPlot(`gd_${id}`,
		[{
			values: [positive, negative],
			labels: ['Clean', 'Not clean'],
			marker: {
				colors: ['#409D69', '#FA604A']
			},
			type: 'pie',
			hole: .6,
			textinfo: 'none',
			hoverinfo: 'none',
			textposition: 'inside',
			sort: false,
		}],
		{
			width: size,
			height: size,
			showlegend: false,
			margin: {"t": 0, "b": 0, "l": 0, "r": 0},
			annotations: [
				{
					font: {
						size: 15
					},
					showarrow: false,
					text: percent,
					x: 0.5,
					y: 0.5
				}
			]
		},
		{
			displayModeBar: false,
		}
	);
}