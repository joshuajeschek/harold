import { Listener } from '@sapphire/framework';
import type { ScheduledTaskEvents } from '@sapphire/plugin-scheduled-tasks';

export class UserEvent extends Listener<typeof ScheduledTaskEvents.ScheduledTaskSuccess> {
	public async run(name: string, _: any, __: any, duration: any) {
		this.container.logger.info(`Task[${name}] succeded. (${Math.round(duration)}ms)`);
	}
}
