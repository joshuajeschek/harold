import { ApplyOptions } from '@sapphire/decorators';
import { methods, Route, ApiRequest, ApiResponse, RouteOptions } from '@sapphire/plugin-api';
import Jimp from 'jimp';
import type { Font } from '@jimp/plugin-print/index';
import path from 'node:path';
import { getImageUrl, getQuery } from '../lib/utils';

@ApplyOptions<RouteOptions>({
	route: '/vote/:subcommand'
})
export class VoteRoute extends Route {
	private headerFont?: Font;
	private contentFont?: Font;
	private yesFont?: Font;
	private noFont?: Font;

	public [methods.GET](request: ApiRequest, response: ApiResponse) {
		this.main(request, response);
	}

	public [methods.POST](request: ApiRequest, response: ApiResponse) {
		this.main(request, response);
	}

	private async main(request: ApiRequest, response: ApiResponse) {
		const subcommand = request.params['subcommand'];

		const ctx = getQuery(request.query['ctx']);
		const yes = getQuery(request.query['yes'], '0');
		const no = getQuery(request.query['no'], '0');
		const state = getQuery(request.query['state'], 'active');

		const author = state === 'active' ? getQuery(request.query['author'], 'Harold') : undefined;

		const content = this.getCardContent(subcommand, ctx);
		response.json({
			requested: { subcommand, author, ctx, yes, no, state },
			result: await this.createVoteCard(`${subcommand}-${state}`, yes, no, content, author)
		});
	}

	loadTemplate = (id: string) => Jimp.read(path.join('resources', 'vote', `${id}.png`));

	private async createVoteCard(template: string, yes: string, no: string, ctx: string, author?: string) {
		this.headerFont ||= await Jimp.loadFont(path.join('resources', 'fonts', 'boxedround-w.fnt'));
		this.contentFont ||= await Jimp.loadFont(path.join('resources', 'fonts', 'boxedround-y.fnt'));
		this.yesFont ||= await Jimp.loadFont(path.join('resources', 'fonts', 'boxedround-mg.fnt'));
		this.noFont ||= await Jimp.loadFont(path.join('resources', 'fonts', 'boxedround-mr.fnt'));

		const image = (await this.loadTemplate(template))
			.print(this.contentFont, 30, 105, ctx, 350)
			.print(this.yesFont, 465, 110, yes)
			.print(this.noFont, 465, 185, no);

		if (author) image.print(this.headerFont, 76, 27, `Vote by: ${author}`);

		const buffer = await image.getBufferAsync(Jimp.MIME_PNG).catch((e) => this.container.logger.error('Error while buffering a vote image:', e));

		if (!buffer) return;

		const url = getImageUrl(buffer);

		return url;
	}

	private getCardContent(subcommand: string, ctx?: string) {
		switch (subcommand) {
			case 'kick':
				return `Kick player ${ctx}?`;
			case 'change-map':
				return `Change map to ${ctx}?`;
			case 'timeout':
				return 'Call a timeout?';
			default:
				return `Surrender?`;
		}
	}
}
