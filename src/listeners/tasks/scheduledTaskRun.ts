import { Listener } from '@sapphire/framework';
import type { ScheduledTaskEvents } from '@sapphire/plugin-scheduled-tasks';

export class UserEvent extends Listener<typeof ScheduledTaskEvents.ScheduledTaskRun> {
	public async run(name: string) {
		this.container.logger.info(`Task[${name}] starting.`);
	}
}
