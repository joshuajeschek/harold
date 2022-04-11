import { fetch, FetchResultTypes } from '@sapphire/fetch';
import { container } from '@sapphire/framework';
import { isThenable } from '@sapphire/utilities';
import { MessageAttachment, TextBasedChannel } from 'discord.js';
import Vibrant from 'node-vibrant';
import sharp from 'sharp';
import randomUseragent from 'random-useragent';

export const safelyError = (e: any, ctx: string) =>
	container.logger.error(`${e.name} [${ctx}]: ${e.message}${e.cause ? `\n${e.cause}` : ''}${e.stack ? `\n${e.stack}` : ''}`);

export function haroldApi(route: string): Promise<RouteResponse> {
	const url = (process.env['BASE_URL'] ?? 'http://localhost') + route;
	container.logger.info('fetching ', url);
	return fetch(url);
}

/**
 * returns a string representations of a query parameter
 * @param raw the raw query, as returned by request.query
 */
export function getQuery(raw: string | string[] | undefined): string | undefined;
export function getQuery(raw: string | string[] | undefined, def: string): string;
export function getQuery(raw: string | string[] | undefined, def?: string): string | undefined {
	if (!raw) return def;
	if (typeof raw === 'string') return raw;
	return raw.join();
}

export async function getPngUrl(url?: string) {
	if (!url?.includes('.svg')) return url;
	const fetched = await fetch(url, { headers: { 'User-Agent': randomUseragent.getRandom() } }, FetchResultTypes.Buffer);
	const buffer = await sharp(fetched).toFormat('png').toBuffer();
	return (await getImageUrl(buffer)) || undefined;
}

let imageChannel: TextBasedChannel;
export async function getImageUrl(buffer: Buffer): Promise<string | null> {
	imageChannel ||= (await container.client.channels.fetch('813551053844643860')) as TextBasedChannel;
	const message = await imageChannel.send({ files: [new MessageAttachment(buffer)] });
	return message.attachments.at(0)?.url ?? null;
}

/**
 * formats a milliseconds input to the format "W days X hours Y minutes Z seconds"
 * @param milliseconds uptime of the bot
 * @returns nicely formatted time information
 */
export function millisecondsToTime(milliseconds: number | null): string {
	if (milliseconds === null) {
		return 'N/A';
	}
	const seconds = Math.round((milliseconds / 1000) % 60);
	const minutes = Math.round((milliseconds / (1000 * 60)) % 60);
	const hours = Math.round((milliseconds / (1000 * 60 * 60)) % 24);
	const days = Math.round((milliseconds / (1000 * 60 * 60 * 24)) % 60);

	if (seconds + minutes + hours + days === 0) {
		return 'N/A';
	}

	return (
		`${days != 0 ? `${days} ${days === 1 ? 'day' : 'days'}, ` : ''}` +
		`${hours != 0 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}, ` : ''}` +
		`${minutes != 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, ` : ''}` +
		`${seconds != 0 ? `${seconds} ${seconds === 1 ? 'second' : 'seconds'}` : ''}`
	);
}

let botAccentColor: number;
export async function getBotAccentColor(): Promise<number> {
	if (botAccentColor) return botAccentColor;
	// not necessary, since bot users currently always have accentColor=null
	// if (!this.container.client.user?.accentColor) await this.container.client.user?.fetch(true);
	// if (this.container.client.user?.accentColor) return this.container.client.user.accentColor;
	if (!container.client.user) return 3092790;
	botAccentColor = (await getAccentColor(container.client.user.displayAvatarURL({ format: 'png' }))) ?? 3092790;
	return botAccentColor;
}

export async function getAccentColor(url?: Promise<string | undefined> | string): Promise<number | undefined> {
	url = isThenable(url) ? await url : url;
	if (!url) return;
	const palette = await Vibrant.from(url)
		.getPalette()
		.catch((e) => safelyError(e, `get accent color from ${url}`));
	if (!palette) return undefined;
	return palette.Vibrant?.hex ? parseInt(palette.Vibrant?.hex.replaceAll(/[^0-9a-fA-f]/g, ''), 16) : undefined;
}

export function truncateArray(array: string[], maxSize: number, offset?: number): string[] {
	while (array.reduce<number>((prev, curr) => prev + curr.length + (offset ?? 0), 0) > maxSize) array.pop();
	return array;
}

export async function isValidUserId(id: string): Promise<boolean> {
	try {
		return !!(await container.client.users.fetch(id));
	} catch {
		return false;
	}
}
