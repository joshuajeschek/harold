import type { Guild } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command, CommandOptions } from '@sapphire/framework';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { pickBy } from 'lodash';
import { getGuildIds } from '../../lib/env-parser';
import { getBotAccentColor, safelyError } from '../../lib/utils';
import settingsEmbed from './assets/settingsEmbed.json';

@ApplyOptions<CommandOptions>({
	description: 'Change the bots settings in this guild',
	preconditions: ['GuildOnly', 'OwnerAndGuildManagerOnly']
})
export class SettingsCommand extends Command {
	public async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId) return interaction.reply({ content: 'Please use this only in a guild.', ephemeral: true });

		// new settings should be added here (and at the bottom in the options)
		const settings = pickBy({
			id: interaction.guildId,
			prefix: interaction.options.getString('prefix', false) ?? undefined,
			voteTime: interaction.options.getNumber('vote-time') ?? undefined,
			voteCount: interaction.options.getInteger('vote-count') ?? undefined
		}) as Guild;

		this.container.db.guild
			.upsert({
				where: { id: interaction.guildId ?? undefined },
				create: settings,
				update: settings
			})
			.catch((e) => safelyError(e, 'fetch settings'))
			.then(async (guild) => {
				const content = guild ? 'Your settings:' : "Couldn't fetch your current settings :(";
				const embed = await this.compileSettingsEmbed(guild);
				const updated = Object.keys(settings).filter((v) => v !== 'id');
				if (updated.length > 0) embed.setFooter({ text: `updated: ${updated}`.replaceAll(',', ', ') });
				await interaction.reply({ content, embeds: [embed], ephemeral: true });
			});
	}

	private async compileSettingsEmbed(guild: void | Guild): Promise<MessageEmbed> {
		const embed = new MessageEmbed(settingsEmbed).setColor(await getBotAccentColor());
		if (this.container.client.user) embed.setThumbnail(this.container.client.user.displayAvatarURL());
		if (!guild) return embed;

		let currentSettings = '';
		Object.entries(guild).forEach(([key, value]) => {
			if (key === 'id') return;
			currentSettings += `${key}: \`${value}\`\n`;
		});
		if (currentSettings.length !== 0) embed.addField('Current Settings:', currentSettings);

		return embed;
	}

	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand(
			(b) =>
				b
					.setName(this.name)
					.setDescription(this.description)
					.addStringOption((o) => o.setName('prefix').setDescription('the prefix for chat commands'))
					.addNumberOption((o) =>
						o.setName('vote-time').setDescription('the maximum vote time (in minutes)').setMinValue(0.1).setMaxValue(10)
					)
					.addIntegerOption((o) =>
						o.setName('vote-count').setDescription('how many votes to pass / fail a vote').setMinValue(1).setMaxValue(99)
					),
			{ guildIds: getGuildIds(), idHints: ['958851498379468832'] }
		);
	}
}
