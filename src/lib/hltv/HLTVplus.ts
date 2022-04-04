import { container } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { ApplicationCommandOptionChoice, Collection } from 'discord.js';
import { FullPlayer, FullTeam, Hltv, TeamPlayerType } from 'hltv';
import NodeCache from 'node-cache';
import player from './player';
import rankingplayers from './rankingplayers';
import rankingteams from './rankingteams';
import team from './team';
import Pageres from 'pageres';
import sharp from 'sharp';
import randomUseragent from 'random-useragent';
import { getAccentColor, getImageUrl, safelyError } from '../utils';
import { fetch, FetchResultTypes } from '@sapphire/fetch';

interface HLTVOptionChoice extends ApplicationCommandOptionChoice {
	ctx: string[];
	value: number;
}

interface FullTeamPlus extends FullTeam {
	accentColor?: Promise<number | undefined>;
	pngLogo?: Promise<string | undefined> | string;
}

type HltvAction = 'player' | 'team' | 'rankingplayers' | 'rankingteams';

export default class HLTVPlus extends Hltv {
	#players?: HLTVOptionChoice[];
	#teams?: HLTVOptionChoice[];

	// objects are cached for one day, expired elements are check every 10 minutes
	#ttl = Time.Day / 1000;
	#cache = {
		players: new NodeCache({ stdTTL: this.#ttl }),
		teams: new NodeCache({ stdTTL: this.#ttl }),
		teamlineups: new NodeCache({ stdTTL: this.#ttl })
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

	public getChoices = (type: 'player' | 'team') => (type === 'player' ? this.#players : this.#teams) || this.updateChoices(type);
	public async updateChoices(): Promise<void>;
	public async updateChoices(type: 'player' | 'team'): Promise<HLTVOptionChoice[]>;
	public async updateChoices(type?: 'player' | 'team'): Promise<void | HLTVOptionChoice[]> {
		container.logger.info('[HLTV+] updating choices...');
		if (!type || type === 'player') {
			const playerRanking = await this.getPlayerRanking();
			this.#players = playerRanking
				.map((entry) => ({
					name: entry.player.name,
					value: entry.player.id,
					ctx: [entry.player.name].concat(entry.teams.map((t) => t.name))
				}))
				.filter((entry) => entry.value) as HLTVOptionChoice[];
		}
		if (!type || type === 'team') {
			const teamRanking = await this.getTeamRanking();
			this.#teams = teamRanking
				.map((entry) => ({
					name: entry.team.name,
					value: entry.team.id,
					ctx: [entry.team.name]
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

	public async getCachedPlayer({ id }: { id: number }): Promise<FullPlayer | undefined> {
		const cachedPlayer = this.#cache.players.get<FullPlayer>(id);
		if (cachedPlayer) return cachedPlayer;
		const player = await this.getPlayer({ id }).catch((e) => safelyError(e, 'get player'));
		if (!player) return;
		this.#cache.players.set<FullPlayer>(id, player);
		return player;
	}

	public async getPngUrl(url?: string) {
		if (!url?.includes('.svg')) return url;
		const fetched = await fetch(url, { headers: { 'User-Agent': randomUseragent.getRandom() } }, FetchResultTypes.Buffer);
		const buffer = await sharp(fetched).toFormat('png').toBuffer();
		return (await getImageUrl(buffer)) || undefined;
	}

	private playerSortOrder = [TeamPlayerType.Starter, TeamPlayerType.Coach, TeamPlayerType.Substitute, TeamPlayerType.Benched];
	public async getCachedTeam({ id }: { id: number }): Promise<FullTeamPlus | undefined> {
		const cachedTeam = this.#cache.teams.get<FullTeamPlus>(id);
		if (cachedTeam) return cachedTeam;
		const team: FullTeamPlus | void = await this.getTeam({ id }).catch((e) => safelyError(e, 'get team'));
		if (!team) return;
		team.players.sort((a, b) => this.playerSortOrder.indexOf(a.type) - this.playerSortOrder.indexOf(b.type));
		team.pngLogo = this.getPngUrl(team.logo);
		if (team.logo) team.accentColor = getAccentColor(team.pngLogo);
		this.#cache.teams.set<FullTeamPlus>(id, team);
		return team;
	}

	public async getCachedLineup({ id }: { id: number }): Promise<string | null> {
		const cachedTeamLineup = this.#cache.teamlineups.get<string>(id);
		if (cachedTeamLineup) return cachedTeamLineup;
		const player = await this.getLineup({ id });
		// cache missed lineup for half an hour, after that retry will be possible
		this.#cache.teamlineups.set<string | null>(id, player, player ? this.#ttl : Time.Hour / 2 / 1000);
		return player;
	}

	public async getLineup({ id }: { id: number }): Promise<string | null> {
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

		if (!lineup) return null;

		return getImageUrl(lineup);
	}
}
