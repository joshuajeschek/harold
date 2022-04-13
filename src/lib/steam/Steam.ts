import SteamUser from 'steam-user';
import { container } from '@sapphire/framework';
import GlobalOffensive from 'globaloffensive';
import { safelyError } from '../utils';
import type { IncomingFriendMessage } from 'steam-user/components/chatroom';
import type SteamID from 'steamid';
import { Collection } from 'discord.js';

interface GlobalOffensiveUser {
	user: SteamUser;
	csgo: GlobalOffensive;
	friends: number;
}

export enum AddFriendError {
	DuplicateName = 14,
	Blocked = 40,
	SlotShortage = -250
}

type AddFriendResult = { accountName: string; error?: AddFriendError };

const MAX_FRIENDS = 250;

export class Steam {
	#users = new Collection<string, GlobalOffensiveUser>();

	constructor() {
		this.logOn();
	}

	private async logOn() {
		container.logger.info('[STEAM] Logging in');
		(await container.db.steamAccount.findMany()).forEach((account) => {
			container.logger.debug(`[STEAM](${account.name}) Logging in `);
			// CREATE USER
			const user = new SteamUser();
			const csgo = new GlobalOffensive(user);
			const globalOffensiveUser = { user, csgo, friends: MAX_FRIENDS };
			this.#users.set(account.name, globalOffensiveUser);
			// LISTENERS
			user.on('loggedOn', () => this.loggedOn(user, account.name));
			user.on('friendsList', () => this.friendsList(account.name));
			user.on('friendRelationship', (s, r) => this.friendRelationship(globalOffensiveUser, account.name, s, r));
			user.chat.on('friendMessage', (message) => this.friendMessage(user, message));
			csgo.on('connectedToGC', () => this.connectedToGC(account.name));
			// ACTUALLY LOG ON
			user.logOn({ accountName: account.name, password: account.password });
		});
	}

	public async addFriend(steamID: string | SteamID): Promise<AddFriendResult> {
		// const { user, name: accountName } = this.#users.reduce<Partial<GlobalOffensiveUser> & { name: string }>(
		// 	(prev, curr, name) => (curr.friends < (prev.friends || MAX_FRIENDS) ? { name, ...curr } : prev),
		// 	{ friends: MAX_FRIENDS, name: '' }
		// );
		const possibleUsers = this.#users.filter((user) => user.friends < MAX_FRIENDS).sort((a, b) => a.friends - b.friends);
		let res: AddFriendResult = { accountName: '', error: AddFriendError.SlotShortage };
		while (possibleUsers.size > 0) {
			const accountName = possibleUsers.firstKey()!;
			const user = possibleUsers.first()!.user;
			res = await user
				.addFriend(steamID)
				.then(() => ({ accountName }))
				.catch(({ eresult: error }: Error & { eresult: AddFriendError.Blocked | AddFriendError.DuplicateName }) => ({ error, accountName }));
			if (res.error !== AddFriendError.Blocked) return res;
		}
		return res;
	}

	private countFriends(user: SteamUser) {
		return Object.values(user.myFriends).filter(
			(r) =>
				r === SteamUser.EFriendRelationship.Friend || //
				r === SteamUser.EFriendRelationship.RequestInitiator
		).length;
	}

	// STEAM USER LISTENERS
	private loggedOn = async (user: SteamUser, name: string) => {
		container.logger.info(`[STEAM](${name}) Logged in`);
		await user.requestFreeLicense([730]).catch((e) => safelyError(e, 'requesting free CSGO license'));
		user.setPersona(SteamUser.EPersonaState.Busy);
		user.gamesPlayed(730); // 730 is CSGO's App ID
		user.getFriendsThatPlay(730); // will trigger friendsList event
	};

	private friendsList = (name: string) => {
		const globalOffensiveUser = this.#users.get(name);
		if (!globalOffensiveUser) return;
		globalOffensiveUser.friends = this.countFriends(globalOffensiveUser.user);
	};

	private friendRelationship = async (
		globalOffensiveUser: GlobalOffensiveUser,
		name: string,
		steamID: SteamID,
		relationship: SteamUser.EFriendRelationship
	) => {
		globalOffensiveUser.friends = this.countFriends(globalOffensiveUser.user);
		if (relationship === SteamUser.EFriendRelationship.Friend) {
			container.logger.info(`[STEAM](${name}) friend: ${steamID.getSteamID64()}`);
			await container.db.user.updateMany({ where: { steamID: steamID.getSteamID64() }, data: { befriended: true, steamFriendName: name } });
			(await container.db.user.findMany({ where: { steamID: steamID.getSteamID64() }, select: { id: true } })).forEach(({ id }) => {
				container.client.users
					.createDM(id)
					.then((dmChannel) => dmChannel.send("Hi, you just befriended me on Steam. I'll now be able to display you stats on Discord."))
					.catch((e) => safelyError(e, 'sending DM to user'));
			});
		}
		if (relationship === SteamUser.EFriendRelationship.Blocked || relationship === SteamUser.EFriendRelationship.None) {
			container.logger.info(`[STEAM](${name}) UNfriend: ${steamID.getSteamID64()}`);
			container.db.user.updateMany({ where: { steamID: steamID.getSteamID64() }, data: { befriended: false, steamFriendName: null } });
		}
		if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
			container.logger.info(`[STEAM](${name}) request: ${steamID.getSteamID64()}`);
			const user = await container.db.user.findFirst({ where: { steamID: steamID.getSteamID64(), befriended: false } });
			if (user) this.addFriend(steamID);
		}
	};

	// CHATROOM LISTENERS
	private friendMessage = async (user: SteamUser, message: IncomingFriendMessage) => {
		container.logger.debug(`[STEAM] message: ${message.steamid_friend}: ${message.message}`);
		if (!message.message.toLowerCase().includes('ping')) return;
		user.chat.sendFriendMessage(message.steamid_friend, 'Pong!').catch((e) => safelyError(e, 'sending steam pong'));
	};

	// GLOBALOFFENSIVE LISTENERS
	private connectedToGC = (name: string) => {
		container.logger.info(`[CSGO](${name}) connected to GC`);
	};
}

export default Steam;
