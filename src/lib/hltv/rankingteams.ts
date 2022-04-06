import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/framework';
import { Stopwatch } from '@sapphire/stopwatch';
import { Time } from '@sapphire/time-utilities';
import { ButtonInteraction, CommandInteraction, MessageEmbed } from 'discord.js';
import { customEmojis } from '../constants';
import { safelyError, truncateArray } from '../utils';

const TEAMS_PER_PAGE = 5;

export default async (interaction: CommandInteraction | ButtonInteraction) => {
	const stopwatch = new Stopwatch();
	const { ranking, timestamp } = (await container.hltv.getCachedTeamRanking()) ||
		(await container.hltv.getCachedTeamRanking(true)) || { ranking: undefined, date: new Date() };

	if (!ranking) return interaction.editReply('An error occured while retrieving team ranking.');

	const embeds: MessageEmbed[] = [];

	const template = new MessageEmbed()
		.setAuthor({ name: 'hltv.org', url: 'https://www.hltv.org', iconURL: 'https://www.hltv.org/img/static/TopSmallLogo2x.png' })
		.setColor('#2b6ea4')
		.setTimestamp(timestamp);

	ranking.forEach((teamRanking, index, arr) => {
		if (index % TEAMS_PER_PAGE === 0) {
			if (embeds.length === 25) return;
			embeds.push(
				new MessageEmbed(template)
					.setDescription(`${customEmojis.csguy} HLTV Team Ranking, ranks ${index + 1} to ${Math.min(index + TEAMS_PER_PAGE, arr.length)}`)
					.setFooter({ text: `${stopwatch}` })
			);
		}

		let change = teamRanking.change.toString();
		if (teamRanking.change === 0) change = `±${teamRanking.change}`;
		else if (teamRanking.change > 0) change = `+${teamRanking.change}`;

		let icon = '➡️ ';
		if (teamRanking.isNew) icon = '✨ ';
		else if (teamRanking.change > 0) icon = '↗️ ';
		else if (teamRanking.change < 0) icon = '↘️ ';

		embeds.at(-1)?.addField(`#${teamRanking.place} ${teamRanking.team.name} (${change})`, `${icon}${teamRanking.points} points`);
	});

	if (embeds.length === 0) return interaction.editReply('An error occured while retrieving team ranking.');

	const paginatedMessage = await new PaginatedMessage()
		.addPages(embeds.map((e) => ({ embeds: [e] })))
		.setIdle(Time.Minute * 10)
		.setSelectMenuOptions((i) => ({
			label: `ranks ${(i - 1) * TEAMS_PER_PAGE + 1} to ${Math.min((i - 1) * TEAMS_PER_PAGE + TEAMS_PER_PAGE, ranking.length)}`,
			description: truncateArray(
				ranking.slice((i - 1) * TEAMS_PER_PAGE, (i - 1) * TEAMS_PER_PAGE + TEAMS_PER_PAGE).map((tr) => tr.team.name),
				100,
				2
			).join(', ')
		}))
		.run(interaction)
		.catch((e) => safelyError(e, 'send team ranking paginated message'));

	if (!paginatedMessage) return interaction.editReply('An error occured while retrieving team ranking.');

	return;
};
