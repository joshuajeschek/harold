interface VoteRouteResponse {
	requested: {
		subcommand: string;
		author?: string;
		state: string;
		ctx?: string;
		yes: string;
		no: string;
	};
	result: string;
}

type RouteResponse = VoteRouteResponse;
