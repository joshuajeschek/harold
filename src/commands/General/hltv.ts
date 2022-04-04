import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command, CommandOptions } from '@sapphire/framework';
import { deepClone } from '@sapphire/utilities';
import type { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { getGuildIds } from '../../lib/env-parser';
import levenshtein from 'js-levenshtein';
import HLTVPlus from '../../lib/hltv/HLTVplus';
import { safelyError } from '../../lib/utils';

@ApplyOptions<CommandOptions>({
	description: 'Get information about pro players and teams.'
})
export class VoteCommand extends Command {
	public async chatInputRun(interaction: CommandInteraction) {
		await interaction.deferReply();
		if (!interaction.guildId || !interaction.member) return;
		const action = (interaction.options.getSubcommandGroup(false) ?? '') + interaction.options.getSubcommand(true);
		if (!HLTVPlus.isHltvAction(action)) return;
		const id = interaction.options.getNumber(action) ?? 0;
		this.container.hltv.actions[action](interaction, { id });
	}

	public async autocompleteRun(interaction: AutocompleteInteraction) {
		const subcommand = interaction.options.getSubcommand(true);
		if (subcommand !== 'player' && subcommand !== 'team') return;

		const input = interaction.options.get(subcommand)?.value?.toString();
		const choices = deepClone(await this.container.hltv.getChoices(subcommand));
		if (input)
			choices.sort((a, b) => {
				const aScore = a.ctx.reduce<number>((min, value) => Math.min(min, levenshtein(value.slice(0, input.length), input)), Infinity);
				const bScore = b.ctx.reduce<number>((min, value) => Math.min(min, levenshtein(value.slice(0, input.length), input)), Infinity);
				return aScore - bScore;
			});
		interaction.respond(choices.slice(0, 25)).catch((e) => safelyError(e, 'autocomplete hltv'));
	}

	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand(
			(b) =>
				b
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((b) =>
						b
							.setName('player')
							.setDescription('Get information about a pro player.')
							.addNumberOption((o) =>
								o.setName('player').setDescription('Which player do you want to look up?').setRequired(true).setAutocomplete(true)
							)
					)
					.addSubcommand((b) =>
						b
							.setName('team')
							.setDescription('Get information about a pro team.')
							.addNumberOption((o) =>
								o.setName('team').setDescription('Which team do you want to look up?').setRequired(true).setAutocomplete(true)
							)
					)
					.addSubcommandGroup((b) =>
						b
							.setName('ranking')
							.setDescription('Get the current HLTV rankings.')
							.addSubcommand((b) => b.setName('teams').setDescription('Get the current HLTV team ranking.'))
							.addSubcommand((b) => b.setName('players').setDescription('Get the current HLTV player ranking.'))
					),
			{ guildIds: getGuildIds(), idHints: [] }
		);
	}
}
