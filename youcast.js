var Client                = require('castv2-client').Client;
var DefaultMediaReceiver  = require('castv2-client').DefaultMediaReceiver;
var mdns                  = require('mdns');
var client;
var player;

var url = process.argv[2];

if(/help/.test(url) || !url){
  console.log('Usage youcast <url>');
  process.exit();
} else {
  discover();
}

function discover(){
  var browser = mdns.createBrowser(mdns.tcp('googlecast'));
  browser.on('serviceUp', function(service){
    clearTimeout(timeout);
    browser.stop();
    connect(service);
  });
  browser.start();
  console.log('Searching for Chromecast...');
  var timeout = setTimeout(function(){
    console.log('No Chromecast was found.');
    browser.stop();
    process.exit();
  }, 15000);
}

function connect(cast){
  client = new Client();
  console.log('Connecting to Device "%s"', cast.name);
  client.connect(cast.addresses[0], launch);
  client.on('error', onError);
}

function launch(){
  console.log('Connected, launching app ...');
  client.launch(DefaultMediaReceiver, play);
}

function play(err, p){
  if(err){
    return onError(err);
  }

  player = p;
  player.on('status', onState);
  player.load(getMedia(), { autoplay: true }, function(err, status) {
    if(err){
      return onError(err);
    }
    onState(status);
  });
}

function onError(err){
  console.log('Error: %s', err.message);
  client.close();
}

function onState(status){
  console.log('status broadcast playerState=%s', status.playerState);
}

function getMedia(){
  return {
    contentId: url,
    contentType: 'video/mp4',
    metadata:{
      title : 'Youcast',
      subtitle : 'Loading…'
    }
  };
}

process.on('SIGINT', function(){
  if(!player && !client){
    process.exit();
  } else {
    console.log('Closing connection, going to exit...');
    if(player) player.stop();
    if(client) client.close();
    setTimeout(function(){
      process.exit();
    }, 1000);
  }
});