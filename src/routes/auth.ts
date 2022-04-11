import { ApplyOptions } from '@sapphire/decorators';
import { methods, Route, ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { randomUUID } from 'crypto';
import NodeCache from 'node-cache';
import { getQuery, isValidUserId } from '../lib/utils';

@ApplyOptions<RouteOptions>({
	route: '/auth'
})
export class AuthRoute extends Route {
	#discordIds = new NodeCache({ stdTTL: 5 * 60 });

	public async [methods.GET](request: ApiRequest, response: ApiResponse) {
		const authId = getQuery(request.query['authId'], randomUUID());
		const discordId = getQuery(request.query['discordId']) || this.#discordIds.get<string>(authId);
		const steamId = getQuery(request.query['steamId']);

		if (!discordId || !(await isValidUserId(discordId))) return response.respond({ success: false });

		if (discordId && steamId) {
			const discordAvatar = (await this.container.client.users.fetch(discordId)).displayAvatarURL({ format: 'png' });
			// TODO
			// save to database and start befriending
			this.#discordIds.del(authId);
			return response.respond({ success: true, discordAvatar });
		}

		this.#discordIds.set<string>(authId, discordId);

		response.respond({ success: true, authId });
	}
}
