export const loadingSnippet = `
<div class="LoadingCard">
  <h1 class="Text H1">Loading Cleanreads...</h1>
  <div class="Button__container">
    <button
      type="button"
      class="Button Button--primary Button--small Button--disabled"
      disabled=""
    >
      <span class="Button__labelItem"
        ><i class="Icon LoadingIcon"
          ><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M12,4.5 C16.1421356,4.5 19.5,7.85786438 19.5,12 C19.5,16.1421356 16.1421356,19.5 12,19.5 C11.7238576,19.5 11.5,19.2761424 11.5,19 C11.5,18.7238576 11.7238576,18.5 12,18.5 C15.5898509,18.5 18.5,15.5898509 18.5,12 C18.5,8.41014913 15.5898509,5.5 12,5.5 C11.7238576,5.5 11.5,5.27614237 11.5,5 C11.5,4.72385763 11.7238576,4.5 12,4.5 Z M5.52355661,12.5744813 C5.58966824,13.3204488 5.78546239,14.0531384 6.10903452,14.7470411 C6.22573733,14.9973111 6.11745975,15.2948013 5.86718976,15.4115041 C5.61691978,15.5282069 5.31942955,15.4199293 5.20272674,15.1696593 C4.8298373,14.3699954 4.60380023,13.5241324 4.52746085,12.6627606 C4.50308319,12.3876964 4.70630482,12.1449507 4.98136906,12.1205731 C5.25643331,12.0961954 5.49917895,12.299417 5.52355661,12.5744813 Z M6.12910354,8.15473449 C6.37034463,8.28911211 6.4569746,8.59361124 6.32259698,8.83485234 C5.9995469,9.4148072 5.76629979,10.041192 5.63203591,10.6910042 C5.57615976,10.9614343 5.31163624,11.1353647 5.04120609,11.0794885 C4.77077594,11.0236124 4.59684555,10.7590889 4.6527217,10.4886587 C4.80759392,9.73910605 5.07653051,9.01687717 5.44898569,8.34822792 C5.58336331,8.10698683 5.88786244,8.02035686 6.12910354,8.15473449 Z M10.5511551,5.13333871 C10.6272703,5.3987838 10.473788,5.67567308 10.2083429,5.75178823 C9.13089659,6.060741 8.17228812,6.63067331 7.39899784,7.40679228 C7.2040925,7.60241058 6.88751054,7.60298855 6.69189224,7.40808321 C6.49627394,7.21317787 6.49569597,6.89659591 6.69060131,6.70097761 C7.58329166,5.8050218 8.69055678,5.14670697 9.93270558,4.79052654 C10.1981507,4.71441138 10.4750399,4.86789362 10.5511551,5.13333871 Z"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="0.6s"
                repeatCount="indefinite"
              ></animateTransform>
            </path></svg></i
      ></span>
    </button>
  </div>
</div>`;

export const reviewSnippet = (chart, reviewHTML, book) => `
<article class="ReviewCard" aria-label="Cleanreads Review">
  <div class="ReviewCard__profile">
    <div class="ReviewerProfile ReviewerProfile--medium">
      <section class="ReviewerProfile__avatar">
        ${chart}
      </section>
      <section class="ReviewerProfile__info">
        <span class="Text Text__title4"
          ><div data-testid="name" class="ReviewerProfile__name">
            <a
              href="https://github.com/HermanFassett/cleanreads-extension"
              >Cleanreads Rating</a
            >
          </div></span
        ><span class="Text Text__body3 Text__subdued"
		><div class="ReviewerProfile__meta">
		  <span>${book.cleanReads.positive} positives</span><span><span>${book.cleanReads.negative} negatives</span></span>
		</div></span
	  >
      </section>
      <div data-testid="follow" class="ReviewerProfile__follow">
        <div id="gr_cleanlistBtn" class="FollowButton">
          <!-- Add to cleanlist button inserted here with events -->
        </div>
      </div>
    </div>
  </div>
  <section class="ReviewCard__content">
    <section class="ReviewCard__row">
    </section>
    <section class="ReviewText">
      <section class="ReviewText__content" dir="auto">
        <div class="TruncatedContent" tabindex="-1">
          <div
		  	id="gr_truncatedContent"
            class="TruncatedContent__text TruncatedContent__text--large"
            tabindex="-1"
            data-testid="contentContainer"
          >
            <span class="Formatted">${reviewHTML}</span>
          </div>
          <div id="gr_gradient" class="TruncatedContent__gradientOverlay">
            <div class="Button__container">
              <button
			  	id="gr_moreBtn"
                type="button"
                class="Button Button--inline Button--small"
                aria-label="Tap to show more review"
              >
                <span class="Button__labelItem">Show more</span
                ><span class="Button__labelItem"
                  ><i class="Icon ChevronIcon"
                    ><svg viewBox="0 0 24 24">
                      <path
                        d="M8.70710678,9.27397892 C8.31658249,8.90867369 7.68341751,8.90867369 7.29289322,9.27397892 C6.90236893,9.63928415 6.90236893,10.2315609 7.29289322,10.5968662 L12,15 L16.7071068,10.5968662 C17.0976311,10.2315609 17.0976311,9.63928415 16.7071068,9.27397892 C16.3165825,8.90867369 15.6834175,8.90867369 15.2928932,9.27397892 L12,12.3542255 L8.70710678,9.27397892 Z"
                        transform="rotate(0 12 12)"
                      ></path></svg></i
                ></span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>
    <hr class="Divider Divider--mediumMargin" role="presentation" />
  </section>
</article>
`