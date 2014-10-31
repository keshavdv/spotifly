#!/usr/bin/env node

var Spotify = require('./lib/spotify');
var program = require('commander');
var prompt = require('prompt');

program
  .version('0.0.1')
  .option('-u, --username <username>', 'username')
  .option('-p, --password <password>', 'password')
  .option('-n, --name <device_name>', 'device name for Spotify Connect (defaults to Spotifly)', "Spotifly")
  .parse(process.argv);

var start = function(username, password){
	console.log("Connecting...");
	Spotify.login(username, password, function (err, spotify) {
	  if (err) throw err;
	  spotify.startConnect(program.name);
	  console.log("Running connect server as " + program.name + "!");
	});
}

var schema = { properties: {}};
if (program.username && program.password) start(result.username, result.password);
else {
	if (!program.username) schema.properties.username = { description: 'Enter your username' };
	if (!program.password) schema.properties.password = { description: 'Enter your password', hidden: true };

	prompt.start();
	prompt.get(schema, function (err, result) {
		if (err) throw err;
		start(program.username || result.username, program.password || result.password);
	});	
}
