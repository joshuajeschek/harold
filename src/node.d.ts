declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production';
		readonly DISCORD_TOKEN: string;
		readonly DISCORD_SECRET: string;
		readonly DISCORD_APP_ID: string;
		readonly OWNERS: string;
		readonly GUILDIDS: string;
		readonly OWNER_GUILDIDS: string;
		readonly DATABASE_URL: string;
		readonly BASE_API_URL: string;
	}
}
