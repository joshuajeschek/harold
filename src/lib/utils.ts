import { container } from '@sapphire/framework';
import type { CommandInteraction, InteractionReplyOptions, MessageComponentInteraction, MessagePayload } from 'discord.js';
import Vibrant from 'node-vibrant';

/**
 * Picks a random item from an array
 * @param array The array to pick a random item from
 * @example
 * const randomEntry = pickRandom([1, 2, 3, 4]) // 1
 */
export function pickRandom<T>(array: readonly T[]): T {
	const { length } = array;
	return array[Math.floor(Math.random() * length)];
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

export function createFilename(prefix: string, type: string) {
	const now = new Date();
	return `${prefix}-${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}.${type}`;
}

export function interactionReplyOrFollowUp(
	interaction: CommandInteraction | MessageComponentInteraction,
	options: string | MessagePayload | InteractionReplyOptions
) {
	if (interaction.replied) return interaction.followUp(options);
	return interaction.reply(options);
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

let accentColor: number;
export async function getAccentColor(): Promise<number> {
	if (accentColor) return accentColor;
	// not necessary, since bot users currently always have accentColor=null
	// if (!this.container.client.user?.accentColor) await this.container.client.user?.fetch(true);
	// if (this.container.client.user?.accentColor) return this.container.client.user.accentColor;
	if (!container.client.user) return 3092790;
	const palette = await Vibrant.from(container.client.user.displayAvatarURL({ format: 'png' })).getPalette();
	accentColor = palette.Vibrant?.hex ? parseInt(palette.Vibrant?.hex.replaceAll(/[^0-9a-fA-f]/g, ''), 16) : 3092790;
	return accentColor;
}
