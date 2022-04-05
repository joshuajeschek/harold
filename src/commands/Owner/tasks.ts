import { ApplyOptions } from '@sapphire/decorators';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { type CommandOptions, Command, type ApplicationCommandRegistry } from '@sapphire/framework';
import type { BullClient } from '@sapphire/plugin-scheduled-tasks/register-redis';
import { codeBlock, deepClone } from '@sapphire/utilities';
import type { JobInformation } from 'bull';
import { CommandInteraction, Message, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js';
import { getOwnerGuildIds } from '../../lib/env-parser';
import { getBotAccentColor, safelyError } from '../../lib/utils';

@ApplyOptions<CommandOptions>({
	description: 'Inspect and Cherry Pick active tasks',
	preconditions: ['OwnerOnly']
})
export class ApplicationCommandsCommand extends Command {
	public async chatInputRun(interaction: CommandInteraction) {
		await interaction.deferReply();
		const repeatableJobs = (await this.container.tasks.listRepeated({})) as JobInformation[];

		const accentColor = await getBotAccentColor();

		const embeds = repeatableJobs.map((job) => {
			const next = new Date(job.next);
			return new MessageEmbed()
				.setTitle(job.key)
				.setColor(accentColor)
				.addField('name:', job.name)
				.addField('cron:', job.cron)
				.addField('next: ', `${next.toLocaleDateString(interaction.locale)} ${next.toLocaleTimeString(interaction.locale)}`);
		});

		const paginatedMessage = await new PaginatedMessage()
			.addPages(embeds.map((embed) => ({ embeds: [embed] })))
			.setSelectMenuOptions((i) => ({ label: repeatableJobs.at(i - 1)?.name || `Page ${i}`, description: repeatableJobs.at(i - 1)?.cron }))
			.run(interaction);

		if (!paginatedMessage.response || !(paginatedMessage.response instanceof Message)) return interaction.followUp('Oops, something went wrong.');

		const filter = (id: string) => (i: MessageComponentInteraction) => i.customId === id && i.user.id === interaction.user.id;

		// TODO upgrade this to .from-syntax in discord.js v14
		const components = deepClone(paginatedMessage.response.components);
		components.push(
			new MessageActionRow().addComponents(
				new MessageButton().setCustomId('commands/tasks/delete').setEmoji('🗑️').setLabel('delete task').setStyle('DANGER')
			)
		);
		const message = await paginatedMessage.response.edit({ components });

		message
			.createMessageComponentCollector({
				filter: filter('commands/tasks/delete')
			})
			.on('collect', async (i) => {
				const key = repeatableJobs.at(paginatedMessage.index)?.key;
				if (!key) return i.reply('Error retrieving key.');
				(this.container.tasks.strategy.client as BullClient)
					.removeRepeatableByKey(key)
					.catch((e) => {
						safelyError(e, 'remove repeatable by key');
						i.reply(`Something went wrong while removing repeatable by key. ${codeBlock(e.message, 'console')}`);
					})
					.then(() => i.reply(`Succesfully removed repeatable by key ${key}.`));
			});
		return;
	}

	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description), {
			guildIds: getOwnerGuildIds(),
			idHints: []
		});
	}
}
