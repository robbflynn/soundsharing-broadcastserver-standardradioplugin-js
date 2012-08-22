var sys = require('sys');

["message/FlashSocketMessage",
 
 "server/base/ServerSocketUnit",
 "server/builders/message/actions/ServerActionMessageBuilder",
 "server/builders/message/events/ServerEventMessageBuilder",
 "server/managers/actions/ServerActionsManager",
 "server/managers/events/ServerEventDispatcher",
 "server/managers/routing/ServerMessageRouter",
 "server/client/FlashSocketServerClient",
 "server/FlashSocketServer",
 
 "client/base/ClientSocketUnit",
 "client/builders/message/actions/ClientActionMessageBuilder",
 "client/builders/message/events/ClientEventMessageBuilder",
 "client/managers/actions/ClientActionsManager",
 "client/managers/events/ClientEventDispatcher",
 "client/managers/routing/ClientMessageRouter",
 "client/FlashSocketClient",
 
 "utils/register/ObjectRegister"].forEach(function (path) {
  	var n = path.substr(path.lastIndexOf("/") + 1);
  	exports[n] = require('./lib/' + path);
});

exports.createServerBase = function(serverAddress)
{
	var server = new exports.FlashSocketServer();
	
	var router = new ServerMessageRouter(server);
	router.setId(serverAddress);
	server.init();

	server.on("connect", function(client) { 
		router.connected(client); 
	});

	server.on("disconnect", function(client) { 
		router.disconnected(client); 
	});

	server.on("message", function(client, message) { 
		router.process(client, message);
	});
	
	return {
		server: server,
		router: router,
		start: function(port, address) {
			sys.log('[FlashSocketServer(address="' + address + '", port="' + port + '")]');
			server.listen(port, address);
		},
		stop: function() {
			server.close();
		}
	};
};

exports.createClientBase = function()
{
	var client = new exports.FlashSocketClient();
	var router = new ClientMessageRouter(client);
	
	sys.log('[FlashSocketClient()]');
	
	client.on("connect", function() { 
		router.connected(); 
	});

	client.on("disconnect", function() { 
		router.disconnected(); 
	});

	client.on("message", function(message) { 
		router.process(message);
	});
	
	return {
		client: client,
		router: router
	};
};