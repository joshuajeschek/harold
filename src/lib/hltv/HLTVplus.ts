import { container } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { ApplicationCommandOptionChoice, Collection } from 'discord.js';
import { FullPlayer, FullTeam, Hltv, PlayerRanking, TeamPlayerType, TeamRanking } from 'hltv';
import NodeCache from 'node-cache';
import player from './player';
import rankingplayers from './rankingplayers';
import rankingteams from './rankingteams';
import team from './team';
import Pageres from 'pageres';
import { getAccentColor, getImageUrl, getPngUrl, safelyError } from '../utils';

interface HLTVOptionChoice extends ApplicationCommandOptionChoice {
	ctx: string[];
	value: number;
}

interface FullTeamPlus extends FullTeam {
	accentColor?: Promise<number | undefined>;
	pngLogo?: Promise<string | undefined> | string;
	lineup?: Promise<string | undefined> | string;
	timestamp: Date;
}

interface FullPlayerPlus extends FullPlayer {
	timestamp: Date;
}

type HltvAction = 'player' | 'team' | 'rankingplayers' | 'rankingteams';

export default class HLTVPlus extends Hltv {
	#players?: HLTVOptionChoice[];
	#teams?: HLTVOptionChoice[];
	#teamRanking?: { ranking?: TeamRanking[]; timestamp: Date };
	#playerRanking?: { ranking?: PlayerRanking[]; timestamp: Date };

	// objects are cached for one day, expired elements are check every 10 minutes
	#ttl = Time.Day / 1000;
	#cache = {
		players: new NodeCache({ stdTTL: this.#ttl }),
		teams: new NodeCache({ stdTTL: this.#ttl })
	};

	public readonly actions = { player, team, rankingplayers, rankingteams };

	constructor({ fetchChoices }: { fetchChoices: boolean }) {
		super();
		if (fetchChoices) this.updateChoices();
	}

	public static isHltvAction = (action?: string): action is HltvAction =>
		!!action && ['player', 'team', 'rankingplayers', 'rankingteams'].includes(action);
	public static getUrl = (domain: string, name: string, id: number) =>
		`https://www.hltv.org/${domain}/${id}/${name.toLowerCase().replaceAll(/ |\?/g, '-')}`;
	public static getUrlString = (domain: string, name: string, id?: number) => (id ? `[${name}](${this.getUrl(domain, name, id)})` : name);

	public getChoices = async (type: 'player' | 'team') =>
		(type === 'player' ? this.#players : this.#teams) || (await this.updateChoices(type)) || [];

	public async updateChoices(): Promise<void>;
	public async updateChoices(type: 'player' | 'team'): Promise<HLTVOptionChoice[] | undefined>;
	public async updateChoices(type?: 'player' | 'team'): Promise<void | HLTVOptionChoice[]> {
		container.logger.info('[HLTV+] updating choices...');
		if (!type || type === 'player') {
			const playerRanking = await this.getCachedPlayerRanking().catch((e) => safelyError(e, 'get cached team ranking'));
			this.#players = playerRanking?.ranking
				?.map((entry) => ({
					name: entry.player.name,
					value: entry.player.id,
					ctx: [entry.player.name.toLowerCase()].concat(entry.teams.map((t) => t.name.toLowerCase()))
				}))
				.filter((entry) => entry.value) as HLTVOptionChoice[];
		}
		if (!type || type === 'team') {
			const teamRanking = await this.getCachedTeamRanking().catch((e) => safelyError(e, 'get cached player ranking'));
			this.#teams = teamRanking?.ranking
				?.map((entry) => ({
					name: entry.team.name,
					value: entry.team.id,
					ctx: [entry.team.name.toLowerCase()]
				}))
				.filter((entry) => entry.value) as HLTVOptionChoice[];
		}
		this.handleDuplicateNames(type);
		container.logger.info('[HLTV+] updated choices!');
		if (type === 'player') return this.#players;
		if (type === 'team') return this.#teams;
	}

	private async handleDuplicateNames(type?: 'player' | 'team') {
		if (!type) {
			this.handleDuplicateNames('team');
			this.handleDuplicateNames('player');
			return;
		}
		const toEdit = (!type || type === 'player' ? this.#players : this.#teams) || [];
		const entries = new Collection<string, number[]>();
		toEdit.forEach((entry, index) => {
			const indices = entries.get(entry.name);
			indices ? indices.push(index) : entries.set(entry.name, [index]);
		});
		const duplicates = entries.filter((indices) => indices.length > 1);
		duplicates.forEach((indices, name) => {
			indices.forEach(async (index) => {
				if (type === 'player') {
					const player = await this.getPlayer({ id: toEdit[index].value });
					toEdit[index].name = `${name} (${player.team?.name ?? player.country.name})`;
				} else {
					const team = await this.getTeam({ id: toEdit[index].value });
					toEdit[index].name = `${name} (${team.country.name})`;
				}
			});
		});
	}

	public async getCachedTeamRanking(force?: boolean) {
		if (!force && this.#teamRanking) return this.#teamRanking;
		this.#teamRanking = {
			ranking: (await this.getTeamRanking().catch((e) => safelyError(e, 'get team ranking'))) ?? undefined,
			timestamp: new Date()
		};
		return this.#teamRanking;
	}

	public async getCachedPlayerRanking(force?: boolean) {
		if (!force && this.#playerRanking) return this.#playerRanking;
		const now = new Date();
		const startDate = `${now.getFullYear() - 1}-${now.getMonth()}-${now.getDate()}`;
		const endDate = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
		this.#playerRanking = {
			ranking: (await this.getPlayerRanking({ startDate, endDate }).catch((e) => safelyError(e, 'get team ranking'))) ?? undefined,
			timestamp: now
		};
		return this.#playerRanking;
	}

	public async getCachedPlayer({ id }: { id: number }): Promise<FullPlayerPlus | undefined> {
		const cachedPlayer = this.#cache.players.get<FullPlayerPlus>(id);
		if (cachedPlayer) return cachedPlayer;
		const player = (await this.getPlayer({ id }).catch((e) => safelyError(e, 'get player'))) as FullPlayerPlus | void;
		if (!player) return;
		player.timestamp = new Date();
		this.#cache.players.set<FullPlayerPlus>(id, player);
		return player;
	}

	private playerSortOrder = [TeamPlayerType.Starter, TeamPlayerType.Coach, TeamPlayerType.Substitute, TeamPlayerType.Benched];
	public async getCachedTeam({ id }: { id: number }): Promise<FullTeamPlus | undefined> {
		const cachedTeam = this.#cache.teams.get<FullTeamPlus>(id);
		if (cachedTeam) return cachedTeam;
		const team = (await this.getTeam({ id }).catch((e) => safelyError(e, 'get team'))) as FullTeamPlus | void;
		if (!team) return;
		team.timestamp = new Date();
		team.players.sort((a, b) => this.playerSortOrder.indexOf(a.type) - this.playerSortOrder.indexOf(b.type));
		team.pngLogo = getPngUrl(team.logo);
		if (team.logo) team.accentColor = getAccentColor(team.pngLogo);
		team.lineup = this.getLineup({ id });
		this.#cache.teams.set<FullTeamPlus>(id, team);
		return team;
	}

	public async getLineup({ id }: { id: number }): Promise<string | undefined> {
		const pageres = new Pageres({ scale: 4, transparent: true, timeout: 10 });
		const selectors = [
			'body > div.bgPadding > div.widthControl > div.colCon > div.contentCol > div > div.bodyshot-team-bg',
			'body > div.bgPadding > div > div.colCon > div > div > div.bodyshot-team-bg > div.bodyshot-team.g-grid'
		];
		let lineup =
			(
				await pageres
					.src(`https://www.hltv.org/team/${id}/harold`, ['800x700'], { selector: selectors[0] })
					.run()
					.catch((e) => safelyError(e, 'get lineup primary'))
			)?.at(0) ||
			(
				await pageres
					.src(`https://www.hltv.org/team/${id}/harold`, ['800x700'], { selector: selectors[1] })
					.run()
					.catch((e) => safelyError(e, 'get linup secondary'))
			)?.at(0);

		if (!lineup) return;

		return (await getImageUrl(lineup)) || undefined;
	}
}
