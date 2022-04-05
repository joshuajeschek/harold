import { container } from '@sapphire/framework';
import { Stopwatch } from '@sapphire/stopwatch';
import { isThenable } from '@sapphire/utilities';
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { TeamPlayerType } from 'hltv';
import { flagSuffixes, customEmojis as ce } from '../constants.js';
import { truncateArray } from '../utils.js';
import HLTVPlus from './HLTVplus.js';

export default async (interaction: CommandInteraction | ButtonInteraction, args: { id: number }) => {
	const stopwatch = new Stopwatch();
	const team = await container.hltv.getCachedTeam(args);
	if (!team) return interaction.reply({ content: 'An error occured while retrieving player data. Sorry!', ephemeral: true });

	const description = [];
	const emoji = flagSuffixes.includes(team.country.code.toLowerCase()) ? `:flag_${team.country.code.toLowerCase()}:` : '🌐';
	description.push(`**Country:** ${emoji} ${team.country.name}`);
	if (team.rank) description.push(`**Rank:** ${team.rank}`);

	const socials = [];
	if (team.twitter) socials.push(`${ce.twitter} [Twitter](${team.twitter})`);
	if (team.facebook) socials.push(`${ce.facebook} [Facebook](${team.facebook})`);
	if (team.instagram) socials.push(`${ce.instagram} [Instagram](${team.instagram})`);

	const convertTimeOnTeam = (timeOnTeam: string) => timeOnTeam.replace(/(?<=years|year)(?=[0-9])/, ', ');

	const members = team.players.map((player) => {
		switch (player.type) {
			case TeamPlayerType.Starter:
				return `:star: ${player.name} (${convertTimeOnTeam(player.timeOnTeam)})`;
			case TeamPlayerType.Coach:
				return `🧐 ${player.name} (${convertTimeOnTeam(player.timeOnTeam)}) [coach]`;
			case TeamPlayerType.Substitute:
				return `${ce.none} ${player.name} (${convertTimeOnTeam(player.timeOnTeam)}) [substitute]`;
			default:
				return `${ce.none} ${player.name} (${convertTimeOnTeam(player.timeOnTeam)}) [benched]`;
		}
	});

	const news = team.news.map((article) => `${ce.hltv} [${article.name}](https://www.hltv.org${article.link})`);

	const embed = new MessageEmbed()
		.setTitle(team.name)
		.setURL(HLTVPlus.getUrl('team', team.name, team.id))
		.setThumbnail(isThenable(team.pngLogo) ? container.hltv.TEAM_PLACEHOLDER_IMAGE : team.pngLogo ?? container.hltv.TEAM_PLACEHOLDER_IMAGE)
		.setAuthor({ name: 'hltv.org', url: 'https://www.hltv.org', iconURL: 'https://www.hltv.org/img/static/TopSmallLogo2x.png' })
		.addField(ce.csguy, description.join('\n') || '...', true)
		.setTimestamp(team.timestamp);

	if (socials.length > 0) embed.addField('⠀', socials.join('\n'), true);
	if (members.length > 0) embed.addField('MEMBERS', truncateArray(members, 1024, 1).join('\n'));
	if (news.length > 0) embed.addField('NEWS', truncateArray(news, 1024, 1).join('\n'));

	const starterButtons = team.players.flatMap((player) => {
		if (player.type !== TeamPlayerType.Starter || !player.id) return [];
		return new MessageButton().setCustomId(`hltv/player/${player.id}`).setEmoji('⭐').setLabel(player.name).setStyle('SECONDARY');
	});
	const otherButtons = team.players.flatMap((player) => {
		if (player.type === TeamPlayerType.Starter || !player.id) return [];
		return new MessageButton()
			.setCustomId(`hltv/player/${player.id}`)
			.setEmoji(player.type === TeamPlayerType.Coach ? '🧐' : '👤')
			.setLabel(player.name)
			.setStyle('SECONDARY');
	});

	const components = [];
	if (starterButtons.length > 0) components.push(new MessageActionRow().addComponents(starterButtons));
	if (otherButtons.length > 0) components.push(new MessageActionRow().addComponents(otherButtons));

	embed.setFooter({ text: `${stopwatch} (content)` });

	interaction.editReply({ embeds: [embed], components });

	/* --- */

	stopwatch.restart();

	const lineup = await team.lineup;
	const accentColor = await team.accentColor;
	const logo = await team.pngLogo;

	if (!lineup && !accentColor && !logo) return;

	if (lineup) embed.setImage(lineup);
	if (logo) embed.setThumbnail(logo);
	if (accentColor) embed.setColor(accentColor);

	embed.setFooter({ text: `${embed.footer?.text}, ${stopwatch} (media)` });

	interaction.editReply({ embeds: [embed] });
};
