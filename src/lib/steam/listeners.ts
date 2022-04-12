import { container } from '@sapphire/framework';
import SteamUser from 'steam-user';
import type { IncomingFriendMessage } from 'steam-user/components/chatroom';
import { safelyError } from '../utils';

export const loggedOn = async (user: SteamUser, name: string) => {
	container.logger.info(`[STEAM](${name}) Logged in`);
	await user.requestFreeLicense([730]).catch((e) => safelyError(e, 'requesting free CSGO license'));
	user.setPersona(SteamUser.EPersonaState.Busy);
	user.gamesPlayed(730); // 730 is CSGO's App ID
};

export const friendMessage = async (user: SteamUser, message: IncomingFriendMessage) => {
	container.logger.debug(`[STEAM] message: ${message.steamid_friend}: ${message.message}`);
	if (!message.message.toLowerCase().includes('ping')) return;
	user.chat.sendFriendMessage(message.steamid_friend, 'Pong!').catch((e) => safelyError(e, 'sending steam pong'));
};

export const connectedToGC = (name: string) => {
	container.logger.info(`[CSGO](${name}) connected to GC`);
};
