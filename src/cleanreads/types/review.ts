import { Author } from "./author";
import { User } from "./user";

export type Review = {
	id: string;
	text: string;
	url: string;
	user: User;
	date: Date;
	stars: string;
}