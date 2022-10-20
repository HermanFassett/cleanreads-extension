import { Bookdata } from "../types/bookdata";

export interface Parser {
	parseBookHTML(html: string): Bookdata;
}