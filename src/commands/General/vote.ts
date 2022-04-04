import { ApplyOptions } from '@sapphire/decorators';
import type { APIInteractionGuildMember } from 'discord-api-types/v9';
import { ApplicationCommandRegistry, Command, CommandOptions } from '@sapphire/framework';
import { AutocompleteInteraction, CommandInteraction, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { getGuildIds } from '../../lib/env-parser';
import { haroldApi } from '../../lib/utils';

@ApplyOptions<CommandOptions>({
	description: 'Hold CS:GO-style votes.'
})
export class VoteCommand extends Command {
	readonly #maps = ['Inferno', 'Mirage', 'Nuke', 'Overpass', 'Dust II', 'Vertigo', 'Ancient', 'Train', 'Cache', 'Grind', 'Mocha'].map((m) => ({
		name: m,
		value: m
	}));

	readonly #embedColors = { pass: 32768, fail: 16711680, time: 16711680 };

	public async chatInputRun(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.member) return;
		interaction.deferReply();

		const { voteTime, voteCount } = (await this.container.db.guild.findFirst({
			where: { id: interaction.guildId },
			select: { voteTime: true, voteCount: true }
		})) ?? { voteTime: 5, voteCount: 4 };
		voteCount;

		const subcommand = interaction.options.getSubcommand(true);
		const player = interaction.options.getUser('player', false);
		const playerMember = player ? await interaction.guild?.members.fetch({ user: player }) : undefined;
		const ctx = playerMember ? this.getShortenedMemberName(playerMember, 20) : interaction.options.getString('map', false);
		const author = this.getShortenedMemberName(interaction.member, 17);

		// counts and makes sure nobody votes multiple times
		const votes = { yes: new Set<string>(), no: new Set<string>() };

		const getUrl = (state: string) => `/vote/${subcommand}?yes=${votes.yes.size}&no=${votes.no.size}&author=${author}&ctx=${ctx}&state=${state}`;

		const res = await haroldApi(getUrl('active'));

		const embed = new MessageEmbed().setImage(res.result).setFooter({ text: `vote (${subcommand}) by ${author}, ${voteTime} minutes to vote.` });
		const yesId = `vote/${interaction.id}/yes`;
		const noId = `vote/${interaction.id}/no`;
		const components = [
			new MessageActionRow().addComponents(
				new MessageButton().setCustomId(yesId).setEmoji(':F1:959397308238282782').setLabel('yes').setStyle('SUCCESS'),
				new MessageButton().setCustomId(noId).setEmoji(':F2:959397308066304040').setLabel('no').setStyle('DANGER')
			)
		];
		const message = await interaction.editReply({ embeds: [embed], components });

		if (!(message instanceof Message)) return interaction.followUp('An error occured, sorry');

		// collects yes votes AND closes down noCollector!
		const yesCollector = message.createMessageComponentCollector({
			filter: (i) => i.customId === yesId,
			time: voteTime * 60 * 1000
		});
		const noCollector = message.createMessageComponentCollector({
			filter: (i) => i.customId === noId,
			time: voteTime * 60 * 1000
		});

		yesCollector.on('collect', async (i) => {
			i.deferUpdate();
			votes.yes.add(i.user.id);
			votes.no.delete(i.user.id);

			if (votes.yes.size >= voteCount) return yesCollector.stop('pass');

			const newUrl = (await haroldApi(getUrl('active'))).result;
			embed.setImage(newUrl);
			message.edit({ embeds: [embed] });
		});

		noCollector.on('collect', async (i) => {
			i.deferUpdate();
			votes.no.add(i.user.id);
			votes.yes.delete(i.user.id);

			if (votes.no.size >= voteCount) return yesCollector.stop('fail');

			const newUrl = (await haroldApi(getUrl('active'))).result;
			embed.setImage(newUrl);
			message.edit({ embeds: [embed] });
		});

		// end of both collectors!
		yesCollector.once('end', async (_, reason) => {
			message.edit({ components: [] });
			noCollector.stop(reason);
			if (reason !== 'pass' && reason !== 'fail' && reason !== 'time') {
				interaction.followUp('An error occured, sorry');
				return;
			}
			const newUrl = (
				await haroldApi(`/vote/${subcommand}?yes=${votes.yes.size}&no=${votes.no.size}&author=${author}&ctx=${ctx}&state=${reason}`)
			).result;
			embed.setImage(newUrl).setColor(this.#embedColors[reason]);
			message.edit({ embeds: [embed], components: [] });
		});

		return;
	}

	public async autocompleteRun(interaction: AutocompleteInteraction) {
		const userInput = interaction.options.getString('map', false);
		if (!userInput) return interaction.respond(this.#maps);
		const options = this.#maps
			.filter((m) => m.value.toLowerCase().includes(userInput.toLowerCase()))
			.concat({ name: userInput, value: userInput });
		interaction.respond(options);
	}

	private getShortenedMemberName(member: GuildMember | APIInteractionGuildMember, length: number): string {
		let name = member.user.username.slice(0, length);
		if ('nickname' in member && member.nickname) name = member.nickname.slice(0, length);
		if (name.length === length) name = name.replace(/.{3}$/, '...');
		return name;
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
							.setDescription('Do a CS:GO style kick vote, no players harmed.')
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
					.addSubcommand((b) => b.setName('timeout').setDescription('Call a tactical timeout.')),
			{ guildIds: getGuildIds(), idHints: [] }
		);
	}
}
