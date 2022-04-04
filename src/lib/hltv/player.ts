import { container } from '@sapphire/framework';
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { flagSuffixes, customEmojis as ce } from '../constants.js';
import { truncateArray } from '../utils.js';
import HLTVPlus from './HLTVplus.js';

export default async (interaction: CommandInteraction | ButtonInteraction, args: { id: number }) => {
	const contentStart = performance.now();
	const player = await container.hltv.getCachedPlayer(args);
	if (!player) return interaction.reply({ content: 'An error occured while retrieving player data. Sorry!', ephemeral: true });

	console.log(player);

	const description = [];
	if (player.name) description.push(`**Full name:** ${player.name}`);
	if (player.age) description.push(`**Age:** ${player.age}`);
	const emoji = flagSuffixes.includes(player.country.code.toLowerCase()) ? `:flag_${player.country.code.toLowerCase()}:` : '🌐';
	description.push(`**Country:** ${emoji} ${player.country.name}`);
	if (player.team) description.push(`**Team**: ${player.team.name}`);

	const socials = [];
	if (player.twitter) socials.push(`${ce.twitter} [Twitter](${player.twitter})`);
	if (player.twitch) socials.push(`${ce.twitch} [Twitch](${player.twitch})`);
	if (player.facebook) socials.push(`${ce.facebook} [Facebook](${player.facebook})`);
	if (player.instagram) socials.push(`${ce.instagram} [Instagram](${player.instagram})`);

	const statistics = [];
	if (player.statistics) {
		statistics.push(`${ce.rating} Rating 2.0:${ce.none}${player.statistics.rating}`);
		statistics.push(`${ce.kill} Kills per round:${ce.none}${player.statistics.killsPerRound}`);
		statistics.push(`${ce.hs} Headshots:${ce.none}${player.statistics.headshots}%`);
		statistics.push(`${ce.plan} Maps played:${ce.none}${player.statistics.mapsPlayed}`);
		statistics.push(`${ce.death} Deaths per round:${ce.none}${player.statistics.deathsPerRound}`);
		statistics.push(`${ce.csguy} Rounds contributed:${ce.none}${player.statistics.roundsContributed}%`);
	}

	// achievements, sorted by place, then date (coming in sorted by date)
	// sorting by place just happens by comparing the string at second character (f < s < t!)
	const achievements = player.achievements
		.flatMap((achievement) => {
			switch (achievement.place) {
				case '1st':
					return `:first_place: 1st at ${HLTVPlus.getUrlString('events', achievement.event.name, achievement.event.id)}`;
				case '2nd':
					return `:second_place: 2nd at ${HLTVPlus.getUrlString('events', achievement.event.name, achievement.event.id)}`;
				case '3rd':
					return `:third_place: 3rd at ${HLTVPlus.getUrlString('events', achievement.event.name, achievement.event.id)}`;
				default:
					return [];
			}
		})
		.sort((a, b) => (a.at(1) ?? 'a').localeCompare(b.at(1) ?? 'b'));

	const getTeamDates = (startDate: number, endDate: number) =>
		startDate === endDate
			? `${new Date(startDate).toLocaleDateString(interaction.locale)} - today`
			: `${new Date(startDate).toLocaleDateString(interaction.locale)} - ${new Date(endDate).toLocaleDateString(interaction.locale)}`;

	const teams = player.teams.map(
		(team) => `${HLTVPlus.getUrlString('team', team.name, team.id)}${ce.none}${getTeamDates(team.startDate, team.leaveDate)}`
	);
	const news = player.news.map((article) => `${ce.hltv} [${article.name}](https://www.hltv.org${article.link})`);

	const embed = new MessageEmbed()
		.setTitle(player.ign)
		.setURL(`https://www.hltv.org/player/${player.id}/${player.ign}`)
		.setImage(player.image || container.hltv.PLAYER_PLACEHOLDER_IMAGE)
		.setAuthor({ name: 'hltv.org', url: 'https://www.hltv.org', iconURL: 'https://www.hltv.org/img/static/TopSmallLogo2x.png' })
		.addField(ce.csguy, description.join('\n') || '...', true);

	if (socials.length > 0) embed.addField('⠀', socials.join('\n'), true);
	if (statistics.length > 0) embed.addField('STATISTICS', statistics.join('\n'));
	if (teams.length > 0) embed.addField('TEAMS', truncateArray(teams, 1024, 1).join('\n'));
	if (achievements.length > 0) embed.addField('ACHIEVEMENTS', truncateArray(achievements, 1024, 1).join('\n'));
	if (news.length > 0) embed.addField('NEWS', truncateArray(news, 1024, 1).join('\n'));

	const components = player.team?.id
		? [
				new MessageActionRow().addComponents(
					new MessageButton().setCustomId(`hltv/team/${player.team.id}`).setEmoji('🏢').setLabel(player.team.name).setStyle('SECONDARY')
				)
		  ]
		: undefined;

	const contentEnd = performance.now();

	embed.setFooter({ text: `${Math.round(contentEnd - contentStart)} ms (content)` });

	interaction.editReply({ embeds: [embed], components });

	/* --- */

	const mediaStart = performance.now();

	const team = player.team?.id ? await container.hltv.getCachedTeam({ id: player.team.id }) : undefined;

	const accentColor = await team?.accentColor;
	const logo = await team?.pngLogo;
	if (!logo && !accentColor) return;

	if (logo) embed.setThumbnail(logo);
	if (accentColor) embed.setColor(accentColor);

	const mediaEnd = performance.now();
	embed.setFooter({ text: `${embed.footer?.text}, ${Math.round(mediaEnd - mediaStart)} ms (media)` });

	interaction.editReply({ embeds: [embed] });
};
