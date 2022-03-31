import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command, CommandOptions } from '@sapphire/framework';
import type { AutocompleteInteraction, CommandInteraction } from 'discord.js';
import { inspect } from 'node:util';
import { getGuildIds } from '../../lib/env-parser';

@ApplyOptions<CommandOptions>({
	description: "Get information about the bot's status"
})
export class VoteCommand extends Command {
	readonly #maps = ['Inferno', 'Mirage', 'Nuke', 'Overpass', 'Dust II', 'Vertigo', 'Ancient', 'Train', 'Cache', 'Grind', 'Mocha'].map((m) => ({
		name: m,
		value: m
	}));

	public async chatInputRun(interaction: CommandInteraction) {
		console.log(inspect(interaction, { showHidden: false, depth: null, colors: true }));
		const subcommand = interaction.options.getSubcommand(true);
		return interaction.reply(subcommand);
	}

	public async autocompleteRun(interaction: AutocompleteInteraction) {
		const userInput = interaction.options.getString('map', false);
		if (!userInput) return interaction.respond(this.#maps);
		const options = this.#maps
			.filter((m) => m.value.toLowerCase().includes(userInput.toLowerCase()))
			.concat({ name: userInput, value: userInput });
		interaction.respond(options);
	}

	public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
		registry.registerChatInputCommand(
			(b) =>
				b
					.setName(this.name)
					.setDescription(this.description)
					.addSubcommand((b) =>
						b
							.setName('kick')
							.setDescription('Do a CS:GO style kick vote, no players harmed,')
							.addUserOption((o) => o.setName('player').setDescription('Who should be kicked?').setRequired(true))
					)
					.addSubcommand((b) =>
						b
							.setName('change-map')
							.setDescription('Select the map you want to play on.')
							.addStringOption((o) =>
								o.setName('map').setDescription('On which map do you want to play?').setRequired(true).setAutocomplete(true)
							)
					)
					.addSubcommand((b) =>
						b.setName('surrender').setDescription("Do you really wanna surrender? There's always a chance to come back!")
					)
					.addSubcommand((b) => b.setName('timeout').setDescription('Call a tactical timeout,')),
			{ guildIds: getGuildIds(), idHints: ['959102108026691614'] }
		);
	}
}
