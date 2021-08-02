const c_map = require('./csgo/map')
const playerinfo = require('./csgo/playerinfo')
// const match = require('./hltv/match')
const pro = require('./hltv/pro')
const ranking = require('./hltv/ranking')
const team = require('./hltv/team')
const connect = require('./steam/connect')
const disconnect = require('./steam/disconnect')
const ping = require('./util/ping')
const settings = require('./util/settings')
const uptime = require('./util/uptime')
const kick = require('./vote/kick')
const v_map = require('./vote/map')
const surrender = require('./vote/surrender')
const timeout = require('./vote/timeout')
module.exports = [
    c_map,
    playerinfo,
    // match,
    pro,
    ranking,
    team,
    connect,
    disconnect,
    ping,
    settings,
    uptime,
    kick,
    v_map,
    surrender,
    timeout
]
