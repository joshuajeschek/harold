/* ==============================================
   TEMPORARILY DISCONTINUED (hltv library change)
   ============================================== */

const Commando = require('discord.js-commando');
const levenshtein = require('js-levenshtein');

function getMatchID(recent_results, team_2_name) {
    let selected_match = {
        id: undefined,
        levenshtein: Infinity,
    };

    for (let i = recent_results.length - 1; i >= 0; i--) {
        const cur_levenshtein = levenshtein(recent_results[i].enemyTeam.name, team_2_name);
        if (cur_levenshtein < selected_match.levenshtein) {
            selected_match = {
                id: recent_results[i].matchID,
                levenshtein: cur_levenshtein,
            };
        }
    }

    if (selected_match.levenshtein < 3) return selected_match.id;
    else return undefined;
}

module.exports = class MatchCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'match',
            group: 'hltv',
            memberName: 'match',
            description: 'Get info about a recent or upcoming match between two pro teams',
            examples: ['match'],
            args: [
                {
                    key: 'team_1',
                    label: 'team',
                    prompt: 'Which team played in the match?',
                    default: 'astralis',
                    type: 'string',
                },
                {
                    key: 'team_2',
                    label: 'team',
                    prompt: 'Who did they play against?',
                    default: 'gambit',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { team_1, team_2 }) {
        console.log('>>> match by', msg.author.tag);

        const cooldown = 10 * 1000 - (new Date() - this.client.hltv.last_request); // 10 seconds cooldown timer
        if (cooldown > 0) {
            msg.channel.send(`Please wait ${cooldown / 1000} seconds before using this command again.`);
            return;
        }

        msg.channel.startTyping();
        this.client.hltv.last_request = new Date();

        const team_1_data = await this.client.hltv.getTeamData(team_1);

        if (!team_1_data) {
            msg.channel.send(`Could not find team ${team_1}.`);
            msg.channel.stopTyping();
            return;
        }
        else if (Array.isArray(team_1_data)) {
            let answer = `Could not find team ${team_1}.`;

            if (team_1_data && team_1_data.length > 0) {
                answer += ' Do you mean:\n';
            }
            for (let i = 0; team_1_data && i < team_1_data.length && i < 5; i++) {
                answer += `\`${team_1_data[i][1]}\`\n`;
            }

            msg.channel.send(answer);
            msg.channel.stopTyping();
            return;
        }
        else if (team_1_data === 'HLTVUNAVAILABLE') {
            msg.channel.send('HLTV is currently unavailable, please try again later.' +
                `If this keeps happening, consider contacting ${this.client.owners[0]}`);
            msg.channel.stopTyping();
            return;
        }
        
        if (!team_1_data.recentResults || !(team_1_data.recentResults != 0)) {
            msg.channel.send(`Could not find any recent games regarding team ${team_1}.`);
            msg.channel.stopTyping();
            return;
        }

        const match_id = getMatchID(team_1_data.recentResults, team_2);

        if (!match_id) {
            msg.channel.send(`Could not find any recent games where ${team_1} played against ${team_2}.`);
            msg.channel.stopTyping();
            return;
        }

        const match_data = await this.client.hltv.getMatchData(match_id);

        msg.channel.stopTyping();
    }
};
