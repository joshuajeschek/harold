import { ApplyOptions } from '@sapphire/decorators';
import { methods, Route, ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { randomUUID } from 'crypto';
import NodeCache from 'node-cache';
import { getQuery } from '../lib/utils';

interface AuthData {
	discordId?: string;
	steamId?: string;
}

@ApplyOptions<RouteOptions>({
	route: '/auth'
})
export class AuthRoute extends Route {
	#auth = new NodeCache({ stdTTL: 5 * 60 });

	public async [methods.GET](request: ApiRequest, response: ApiResponse) {
		let authId = getQuery(request.query['authId']);
		const discordId = getQuery(request.query['discordId']);
		const steamId = getQuery(request.query['steamId']);

		if (authId && !this.#auth.has(authId)) return response.respond({ exists: false });

		authId ||= randomUUID();

		const authData = this.#auth.get<AuthData>(authId) || {};
		authData.discordId ||= discordId;
		authData.steamId ||= steamId;

		if (authData.discordId && authData.steamId) {
			const discordAvatar = (await this.container.client.users.fetch(authData.discordId)).displayAvatarURL({ format: 'png' });
			// TODO
			// save to database and start befriending
			this.#auth.del(authId);
			return response.respond({ exists: true, discordAvatar });
		}

		this.#auth.set<AuthData>(authId, authData);

		response.respond({ exists: true, authId });
	}
}
