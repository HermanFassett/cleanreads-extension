import * as cheerio from 'cheerio';
import { Bookdata } from '../types/bookdata';
import { Parser } from "./baseParser";
import { GoodreadsV1Parser } from './goodreads/goodreadsV1Parser';
import { GoodreadsV2Parser } from './goodreads/goodreadsV2Parser';

export class GoodreadsParser implements Parser {
	parseBookHTML(html: string): Bookdata {
		const $ = cheerio.load(html);
		if ($("#bookTitle").length) {
			return new GoodreadsV1Parser().parseBookHTML(html);
		}
		else { // if ($("[data-testid=bookTitle]").length)
			return new GoodreadsV2Parser().parseBookHTML(html);
		}
	}
}