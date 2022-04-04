import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, ListenerOptions } from '@sapphire/framework';
import type { Interaction } from 'discord.js';
import HLTVPlus from '../../lib/hltv/HLTVplus';

@ApplyOptions<ListenerOptions>({
	event: Events.InteractionCreate
})
export class UserEvent extends Listener<typeof Events.InteractionCreate> {
	public async run(interaction: Interaction) {
		if (!interaction.isButton() || !interaction.customId.startsWith('hltv')) return;
		await interaction.deferReply();
		const customId = interaction.customId.split('/');
		const action = customId.at(1);
		const id = Number(customId.at(2));

		if (!HLTVPlus.isHltvAction(action)) return;

		this.container.hltv.actions[action](interaction, { id });
	}
}
