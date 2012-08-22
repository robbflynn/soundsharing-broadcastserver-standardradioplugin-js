var sys = require('sys');
var net = require("net");
var events = require('events');

var FlashSocketServerClient = require('./client/FlashSocketServerClient');

FlashSocketServer = module.exports = function()
{
	this.server = net.createServer();
	this.clients = [];
	this.clientsBySessionId = [];
};

FlashSocketServer.prototype = new events.EventEmitter();
FlashSocketServer.prototype.init = function()
{
	var _self = this;
	
	this.server.on("connection", function (stream) {
		
		var client;
		var connectFn;
		var disconnectFn;
		var messageFn;
		
		connectFn = function() {
			stream.removeListener("connect", connectFn);
			
			client = new FlashSocketServerClient(stream);
			client.on("message", messageFn);
			client.on("disconnect", disconnectFn);
			
			_self.onConnect(client);
		};
		
		disconnectFn = function() {
			client.removeListener("disconnect", disconnectFn);
			client.removeListener("message", messageFn);
			
			_self.onDisconnect(client);
		};
		
		messageFn = function(message) {
			_self.onMessage(client, message);
		};
		
		stream.on("connect", connectFn);
	});
	
	this.server.on('error', function (exc) {
	    sys.log("Ignoring server exception: " + exc);
	});
};

FlashSocketServer.prototype.listen = function(port, address)
{
	address = address ? address : "0.0.0.0";
	port = port ? port : 7000;
	
	this.server.listen(port, address);
};

FlashSocketServer.prototype.close = function()
{
	sys.log("close: ");
	
	this.server.close();
};

/*
 * Broadcast raw message data to all clients
 * 
 * @param {FlashSocketServerMessage} message
 * 
 */

FlashSocketServer.prototype.broadcast = function(message)
{
	var data = message.getData();
	
	for (var s in this.clients)
		this.clients[s].send(data);
};

/*
 * Emit client message event
 * 
 * @param {FlashSocketServerClient} client
 * @param {FlashSocketServerMessage} message
 * 
 */

FlashSocketServer.prototype.onMessage = function(client, message)
{
	this.emit("message", client, message);
};

/*
 * Emit client connect event
 * 
 * @param {FlashSocketServerClient} client
 * 
 */

FlashSocketServer.prototype.onConnect = function(client)
{
	this.clients.push(client);
	this.clientsBySessionId[client.sessionId] = client;
	
	this.emit("connect", client);
	
	sys.log("[Client connected]: " + client.sessionId);
};

/*
 * Emit client disconnect event
 * 
 * @param {FlashSocketServerClient} client
 * 
 */

FlashSocketServer.prototype.onDisconnect = function(client)
{
	var index = this.clients.indexOf(client);
	
	this.clients.splice(index, 1);
	delete(this.clientsBySessionId[client.sessionId]);
	
	this.emit("disconnect", client);
	
	sys.log("[Client disconnected]: " + client.sessionId);
};

/*
 * Emit client disconnect event
 * 
 * @param {String} sessionId
 * return client if exist
 */

FlashSocketServer.prototype.getClientBySessionId = function(sessionId)
{
	return this.clientsBySessionId[sessionId];
};