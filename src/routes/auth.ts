import { ApplyOptions } from '@sapphire/decorators';
import { methods, Route, ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import { randomUUID } from 'crypto';
import NodeCache from 'node-cache';
import { AddFriendError } from '../lib/steam/Steam';
import { getQuery, isValidUserId } from '../lib/utils';

@ApplyOptions<RouteOptions>({
	route: '/auth'
})
export class AuthRoute extends Route {
	#discordIds = new NodeCache({ stdTTL: 5 * 60 });

	public async [methods.GET](request: ApiRequest, response: ApiResponse) {
		const authId = getQuery(request.query['authId'], randomUUID());
		const discordID = getQuery(request.query['discordId']) || this.#discordIds.get<string>(authId);
		const steamID = getQuery(request.query['steamId']);

		if (!discordID || !(await isValidUserId(discordID))) return response.respond({ success: false });

		if (discordID && steamID) {
			this.#discordIds.del(authId);
			const discordAvatar = (await this.container.client.users.fetch(discordID)).displayAvatarURL({ format: 'png' });
			// save to database and start befriending
			response.respond({ success: true, discordAvatar });
			return this.addFriend(discordID, steamID);
		}

		this.#discordIds.set<string>(authId, discordID);

		response.respond({ success: true, authId });
	}

	private async addFriend(discordID: string, steamID: string) {
		await this.container.db.user.upsert({ where: { id: discordID }, create: { id: discordID, steamID }, update: { steamID } });
		const res = await this.container.steam.addFriend(steamID);
		if (!res.error) return;
		switch (res.error) {
			case AddFriendError.Blocked:
				return (await this.container.client.users.createDM(discordID)).send(
					"Looks like you blocked all my available Steam bot accounts. I won't be able to add you as a friend on Steam and show you your stats."
				);
			case AddFriendError.SlotShortage:
				return (await this.container.client.users.createDM(discordID)).send(
					'Sorry, all my friend slots are filled at the moment! Please try again in a few days.'
				);
			case AddFriendError.DuplicateName:
				return this.container.db.user.update({ where: { id: discordID }, data: { befriended: true, steamFriendName: res.accountName } });
			default: // unknown error
				return (await this.container.client.users.createDM(discordID)).send(
					`An unknown error occured while befriending you: Error code: ${res.error}.`
				);
		}
	}
}
