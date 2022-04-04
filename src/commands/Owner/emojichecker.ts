import { ApplyOptions } from '@sapphire/decorators';
import { Command, CommandOptions } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { identity } from 'lodash';

@ApplyOptions<CommandOptions>({
	description: 'Get list of all valid flag emojis',
	chatInputCommand: {
		register: false
	},
	preconditions: ['OwnerOnly']
})
export class VoteCommand extends Command {
	public async messageRun(message: Message) {
		message.channel.sendTyping();
		const alphabet = [
			'a',
			'b',
			'c',
			'd',
			'e',
			'f',
			'g',
			'h',
			'j',
			'i',
			'k',
			'l',
			'm',
			'n',
			'o',
			'p',
			'q',
			'r',
			's',
			't',
			'u',
			'v',
			'w',
			'x',
			'y',
			'z'
		];
		const emojis = (
			await Promise.all(
				alphabet.flatMap((first) => {
					return alphabet.map(async (second) => message.channel.send(`:flag_${first}${second}:`));
				})
			)
		).filter(identity);
		message.reply(emojis.join('\n'));
	}
}
