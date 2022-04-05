import type { PieceContext } from '@sapphire/framework';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

export class UpdateChoices extends ScheduledTask {
	public constructor(context: PieceContext) {
		super(context, {
			cron: '0 19 * * MON'
		});
	}

	public async run() {
		await this.container.hltv.getCachedTeamRanking(true);
		await this.container.hltv.getCachedPlayerRanking(true);
		await this.container.hltv.updateChoices();
	}
}

declare module '@sapphire/framework' {
	interface ScheduledTasks {
		updateChoices: never;
	}
}
