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
				const positive = response.cleanReads ? response.cleanReads.positive : 0;
				const negative = response.cleanReads ? response.cleanReads.negative : 0;
				const percent = negative > 0 ? Math.min(100, Math.round(positive / (positive + negative) * 100)) : 100;
				console.log('Cleanreads rating:', positive, 'positive,', negative, 'negative,', percent + '%');

				if (negative > 0 || positive > 0) {
					target.outerHTML = `<div class='progress-pie-color' data-value='${percent}'></div>`;
				} else {
					target.outerHTML = `<span class='u-defaultType'>No rating</span>`
				}
			}
			
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
					setRating(data, div);
				}
				book.appendChild(td);
			});
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
				const positive = response.cleanReads ? response.cleanReads.positive : 0;
				const negative = response.cleanReads ? response.cleanReads.negative : 0;
				const percent = negative > 0 ? Math.min(100, Math.round(positive / (positive + negative) * 100)) : 100;
				const container = document.querySelector('#cleanReadsRating');

				container.innerHTML = `
					<h2 class='gr-h1 u-bottomGrayBorder' style='text-align:center'>Cleanreads Rating</h2>
					${ negative > 0 || positive > 0 ?
						`<div class='progress-pie-color large center' data-value='${percent}'></div>` :
						`<h2 class='uitext greyText' style='text-align:center'>No rating</h2>`
					}
				`;

				let lastSource = -1;
				response.cleanReads.data.sort((a, b) => a.source - b.source || b.positive - a.positive).forEach(res => {
					if (lastSource !== res.source && res.source === 0)
						container.innerHTML += '<h2 class="uitext greyText">Description:</h2>';
					else if (lastSource !== res.source && res.source === 1)
						container.innerHTML += '<h2 class="uitext greyText">Shelves:</h2>';
					else if (lastSource !== res.source && res.source === 2)
						container.innerHTML += '<h2 class="uitext greyText">Reviews:</h2>';
					container.innerHTML += res.matchHTML;
					lastSource = res.source;
				})
			});
		}
	}
});