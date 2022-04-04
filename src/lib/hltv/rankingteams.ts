import type { ButtonInteraction, CommandInteraction } from 'discord.js';

export default async (interaction: CommandInteraction | ButtonInteraction) => {
	interaction.editReply('ranking teams');
};
