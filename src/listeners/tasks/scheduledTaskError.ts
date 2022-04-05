import { Listener } from '@sapphire/framework';
import type { ScheduledTaskEvents } from '@sapphire/plugin-scheduled-tasks';
import { safelyError } from '../../lib/utils';

export class UserEvent extends Listener<typeof ScheduledTaskEvents.ScheduledTaskError> {
	public async run(error: any, name: any, duration: any) {
		safelyError(error, `Task[${name}](${duration})`);
	}
}
