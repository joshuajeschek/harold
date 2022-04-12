import { PrismaClient } from '@prisma/client';
import { isGuildBasedChannel } from '@sapphire/discord.js-utilities';
import { container, LogLevel, SapphireClient } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import type { Message } from 'discord.js';
import type HltvPlus from './lib/hltv/HLTVplus';
import HLTVplus from './lib/hltv/HLTVplus';
import { ScheduledTaskRedisStrategy } from '@sapphire/plugin-scheduled-tasks/register-redis';
import Steam from './lib/steam/Steam';

export class HaroldClient extends SapphireClient {
	public constructor() {
		super({
			defaultPrefix: '!',
			typing: true,
			regexPrefix: /^(hey +)?bot[,! ]/i,
			caseInsensitiveCommands: true,
			logger: {
				level: LogLevel.Debug
			},
			shards: 'auto',
			intents: [
				'GUILDS',
				'GUILD_MEMBERS',
				'GUILD_BANS',
				'GUILD_EMOJIS_AND_STICKERS',
				'GUILD_VOICE_STATES',
				'GUILD_MESSAGES',
				'GUILD_MESSAGE_REACTIONS',
				'DIRECT_MESSAGES',
				'DIRECT_MESSAGE_REACTIONS'
			],
			presence: {
				activities: [
					{
						name: 'CS:GO',
						type: 'PLAYING'
					}
				]
			},
			loadMessageCommandListeners: true,
			hmr: {
				enabled: process.env.NODE_ENV === 'development',
				usePolling: true,
				interval: Time.Second * 2
			},
			tasks: {
				strategy: new ScheduledTaskRedisStrategy({
					bull: {
						redis: {
							db: 1
						}
					}
				})
			},
			api: {
				auth: {
					id: process.env.DISCORD_APP_ID || '',
					secret: process.env.DISCORD_SECRET || '',
					scopes: ['identify']
				}
			}
		});
	}

	public override async login(token?: string) {
		container.db = new PrismaClient();
		container.hltv = new HLTVplus({ fetchChoices: process.env.NODE_ENV !== 'development' });
		container.steam = new Steam();
		return super.login(token);
	}

	public override async destroy() {
		await container.db.$disconnect();
		this.logger.info('disconnected from database');
		return super.destroy();
	}

	/**
	 * Retrieves the prefix for the guild, or if not used in a guild, the default prefix.
	 * @param ctx The message / interaction that gives context.
	 */
	public override fetchPrefix = async (ctx: Message) => {
		if (isGuildBasedChannel(ctx.channel)) {
			const res = await container.db.guild.findFirst({
				where: { id: ctx.guildId || undefined },
				select: { prefix: true }
			});
			if (res && 'prefix' in res) return res.prefix;
		}
		return [this.options.defaultPrefix, ''] as readonly string[];
	};
}

declare module '@sapphire/pieces' {
	interface Container {
		db: PrismaClient;
		hltv: HltvPlus;
		steam: Steam;
	}
}
