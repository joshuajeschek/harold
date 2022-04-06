import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/framework';
import { Stopwatch } from '@sapphire/stopwatch';
import { Time } from '@sapphire/time-utilities';
import { ButtonInteraction, CommandInteraction, MessageEmbed } from 'discord.js';
import { safelyError, truncateArray } from '../utils';

const PLAYERS_PER_PAGE = 5;

export default async (interaction: CommandInteraction | ButtonInteraction) => {
	const stopwatch = new Stopwatch();
	const { ranking, timestamp } = (await container.hltv.getCachedPlayerRanking()) ||
		(await container.hltv.getCachedPlayerRanking(true)) || { ranking: undefined, date: new Date() };

	if (!ranking) return interaction.editReply('An error occured while retrieving team ranking.');

	const embeds: MessageEmbed[] = [];

	const template = new MessageEmbed()
		.setAuthor({ name: 'hltv.org', url: 'https://www.hltv.org', iconURL: 'https://www.hltv.org/img/static/TopSmallLogo2x.png' })
		.setColor('#2b6ea4')
		.setTimestamp(timestamp);

	ranking.forEach((playerRanking, index, arr) => {
		if (index % PLAYERS_PER_PAGE === 0) {
			if (embeds.length === 25) return;
			embeds.push(
				new MessageEmbed(template)
					.setDescription(`HLTV Team Ranking, ranks ${index + 1} to ${Math.min(index + PLAYERS_PER_PAGE, arr.length)}`)
					.setFooter({ text: `${stopwatch}` })
			);
		}

		const content = [];

		if (playerRanking.rating1 || playerRanking.rating2) content.push(`Rating: **${playerRanking.rating1 || playerRanking.rating2}**`);
		content.push(`K/D: **${playerRanking.kd}** (${playerRanking.kdDiff > 0 ? '+' : ''}${playerRanking.kdDiff})`);
		content.push(`Maps: ${playerRanking.maps}, Rounds: ${playerRanking.rounds}`);

		embeds.at(-1)?.addField(`${playerRanking.player.name}`, content.join('\n'));
	});

	if (embeds.length === 0) return interaction.editReply('An error occured while retrieving team ranking.');

	const paginatedMessage = await new PaginatedMessage()
		.addPages(embeds.map((e) => ({ embeds: [e] })))
		.setIdle(Time.Minute * 10)
		.setSelectMenuOptions((i) => ({
			label: `ranks ${(i - 1) * PLAYERS_PER_PAGE + 1} to ${Math.min((i - 1) * PLAYERS_PER_PAGE + PLAYERS_PER_PAGE, ranking.length)}`,
			description: truncateArray(
				ranking.slice((i - 1) * PLAYERS_PER_PAGE, (i - 1) * PLAYERS_PER_PAGE + PLAYERS_PER_PAGE).map((pr) => pr.player.name),
				100,
				2
			).join(', ')
		}))
		.run(interaction)
		.catch((e) => safelyError(e, 'send team ranking paginated message'));

	if (!paginatedMessage) return interaction.editReply('An error occured while retrieving team ranking.');

	return;
};
