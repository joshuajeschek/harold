import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command, CommandOptions, container } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import type { CommandInteraction, Message } from 'discord.js';
import { getGuildIds } from '../../lib/env-parser';

@ApplyOptions<CommandOptions>({
	description: "Get the bot's ping"
})
export class PingCommand extends Command {
	public async messageRun(message: Message) {
		const reply = await send(message, 'Ping?');
		return send(message, this.calculateResponse(message, reply));
	}
	public async chatInputRun(interaction: CommandInteraction) {
		const reply = (await interaction.reply({ content: 'Ping?', fetchReply: true })) as Message;
		return interaction.editReply(this.calculateResponse(interaction, reply));
	}

	private calculateResponse(message: Message | CommandInteraction, reply: Message): string {
		return `Pong! Bot Latency ${Math.round(container.client.ws.ping)}ms. API Latency ${
			(reply.editedTimestamp || reply.createdTimestamp) - message.createdTimestamp
		}ms.`;
	}

	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description), {
			guildIds: getGuildIds(),
			idHints: ['958711419132579870']
		});
	}
}
