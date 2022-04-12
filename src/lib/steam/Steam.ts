import SteamUser from 'steam-user';
import { container } from '@sapphire/framework';
import GlobalOffensive from 'globaloffensive';
import { loggedOn, friendMessage, connectedToGC } from './listeners';

interface GlobalOffensiveUser {
	user: SteamUser;
	csgo: GlobalOffensive;
}

export class Steam {
	#users = new Map<string, GlobalOffensiveUser>();

	constructor() {
		this.logOn();
	}

	private async logOn() {
		container.logger.info('[STEAM] Logging in');
		(await container.db.steamAccount.findMany()).forEach((account) => {
			container.logger.debug(`[STEAM] Logging in (${account.name})`);
			// CREATE USER
			const user = new SteamUser();
			const csgo = new GlobalOffensive(user);
			this.#users.set(account.name, { user, csgo });
			// LISTENERS
			user.on('loggedOn', () => loggedOn(user, account.name));
			user.chat.on('friendMessage', (message) => friendMessage(user, message));
			csgo.on('connectedToGC', () => connectedToGC(account.name));
			// ACTUALLY LOG ON
			user.logOn({ accountName: account.name, password: account.password });
		});
	}
}

export default Steam;
