var sys = require('sys');
var events = require('events');

var ServerActionsManager = require('../actions/ServerActionsManager');

ServerMessageRouter = module.exports = function(server) 
{
	ServerActionsManager.call(this);
	
	this.server = server;
	
	this.localRoutingMap = {};
	
	this.sendRoutingMapOnConnect = true;
	
	var _self = this;
	
	this.addAction("IDENTIFY_UNIT", function(client, message) {
		_self.executeIdentify(client, message);
	});
	
	this.addAction("IDENTIFY_ALL_UNITS", function(client, message) {
		_self.executeIdentifyAll(client, message);
	});
	
	this.addAction("REGISTER_ROUTING_MAP", function(client, message) {
		_self.executeRegisterRoutingMap(client, message);
	});
};

ServerMessageRouter.prototype = new ServerActionsManager();
ServerMessageRouter.prototype.executeIdentify = function(client, message) 
{
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var action = header.data.action;
	var receiverNamespace = action && action.data ? action.data.receiverNamespace : null;
	
	if (sender)
		this.$identify(receiverNamespace, sender, client);
};

ServerMessageRouter.prototype.executeIdentifyAll = function(client, message) 
{
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	if (sender)
		this.$identifyAll(sender, client);
};

ServerMessageRouter.prototype.executeRegisterRoutingMap = function(client, message) 
{
	var header = message.getJSONHeader();
	var action = header.data.action;
	
	sys.log("ServerMessageRouter[executeRegisterRoutingMap]: " + JSON.stringify(action));
	
	if (action && action.data)
		client.data.routingMap = action.data.routingMap ? action.data.routingMap : null;
};

ServerMessageRouter.prototype.$identify = function(receiverNamespace, receiver, client) 
{
	this.sendAction({
		xtype: "IDENTIFY_UNIT_RESULT",
		data: {
			route: receiverNamespace && this.localRoutingMap[receiverNamespace] ? this.localRoutingMap[receiverNamespace] : null
		},
		receiver: receiver, 
		client: client
	});
};

ServerMessageRouter.prototype.$identifyAll = function(receiver, client) 
{
	sys.log("--- ServerMessageRouter[$identifyAll] ---- " + receiver + " : " + client);
	
	this.sendAction({
		xtype: "IDENTIFY_ALL_UNITS_RESULT",
		data: {
			routingMap: this.localRoutingMap,
			sessionId: client.sessionId
		},
		receiver: receiver, 
		client: client
	});
};

ServerMessageRouter.prototype.send = function(message) 
{
	this.process(null, message);
};

ServerMessageRouter.prototype.process = function(client, message) 
{
	var header = message.getJSONHeader();
	var receiver = header && header.route ? header.route.receiver : null;
	
	if (receiver)
	{
		if (receiver.length > 1)
		{
			if (receiver[0] == this.id)
			{
				var receiverId = receiver[1];
				var c = this.server.getClientBySessionId(receiverId);
				
				if (c)
					c.send(message);
				else
				if (this.unitsById[receiverId])
					this.unitsById[receiverId].process(client, message, receiver);	
			}
		}
		else
		if (receiver.length == 1)
			ServerActionsManager.prototype.process.call(this, client, message);
	}
};

ServerMessageRouter.prototype.getLocalRoutingMap = function() {
	return this.localRoutingMap;
};

ServerMessageRouter.prototype.online = function() {
	return true;
};
ServerMessageRouter.prototype.connected = function(client) {
	client.data.route = [this.id, client.sessionId];
	
	if (this.sendRoutingMapOnConnect)
		this.$identifyAll(this.route, client);
	
	ServerActionsManager.prototype.connected.call(this, client);
};

ServerMessageRouter.prototype.disconnected = function(client) {
	ServerActionsManager.prototype.disconnected.call(this, client);
};