const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
require('dotenv').config();
const user = new SteamUser();


const logOnOptions = {
    accountName: process.env.STEAM_NAME,
    password: process.env.STEAM_PASSWORD
};

user.logOn(logOnOptions);
const csgo_client = new GlobalOffensive(user);

async function getProfileInfo(steamid) {
    csgo_client.requestPlayersProfile('76561198814489169');
    csgo_client.on('playersProfile', (data) => {
        console.log(data);
    })
};

user.on('loggedOn', () =>{
    console.log('succesfully logged on.');
    user.setPersona(SteamUser.EPersonaState.Online);
    user.gamesPlayed(730);
});

user.on('friendMessage', function(steamID, message){
    if (message == 'hi'){
        user.chatMessage(steamID, 'Hello there!');
    }
});

csgo_client.on('connectedToGC', () => {
    console.log('ConnectedToGC');
    getProfileInfo('76561198814489169');
    csgo_client.requestPlayersProfile('76561198070284689');
});

