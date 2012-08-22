var sys = require('sys');
var events = require('events');

var ClientActionsManager = require('../actions/ClientActionsManager');

ClientMessageRouter = module.exports = function(client) 
{
	ClientActionsManager.call(this);
	
	this.client = client;
	
	this.remoteIdentifyAllOnConnect = false;
	this.remoteRegisterAllOnConnect = false;
	
	this.localRoutingMap = {};
	this.remoteRoutingMap = null;
	
	var _self = this;
	
	this.addAction("IDENTIFY_ALL_UNITS_RESULT", function(message) {
		_self.$identifyAll(message);
	});
};

ClientMessageRouter.prototype = new ClientActionsManager();
ClientMessageRouter.prototype.send = function(message) 
{
	this.client.send(message);
};

ClientMessageRouter.prototype.remoteIdentify = function(target)
{
	sys.log("-ClientMessageRouter[remoteIdentify]-");
	
	if (target.receiverNamespace)
		this.sendAction({
			xtype: "IDENTIFY_UNIT",
			data: {
				receiverNamespace: target.receiverNamespace
			},
			sender: target.route,
			receiver: this.route
		});
};

ClientMessageRouter.prototype.remoteIdentifyAll = function()
{
	sys.log("-ClientMessageRouter[remoteIdentifyAll]-");
	
	this.sendAction({
		xtype: "IDENTIFY_ALL_UNITS",
		receiver: this.route
	});
};

ClientMessageRouter.prototype.$identifyAll = function(message)
{
	var header = message.getJSONHeader();
	var action = header.data.action;
	
	if (action && action.data && action.data.routingMap)
	{
		this.remoteRoutingMap = action.data.routingMap;
		this.identifyChildren();
		
		this.emit("identified", action.data);
	}
};

ClientMessageRouter.prototype.remoteRegisterRoutingMap = function()
{
	sys.log("ClientMessageRouter[remoteRegisterRoutingMap]: " + sys.inspect(this.localRoutingMap));
	
	this.sendAction({
		xtype: "REGISTER_ROUTING_MAP",
		data: {
			routingMap: this.localRoutingMap
		},
		receiver: this.route
	});
};

ClientMessageRouter.prototype.getLocalRoutingMap = function() {
	return this.localRoutingMap;
};

ClientMessageRouter.prototype.getRemoteRoutingMap = function() {
	return this.remoteRoutingMap;
};

ClientMessageRouter.prototype.online = function() 
{
	return this.client.connected;
};

ClientMessageRouter.prototype.connected = function() {
	
	this.setId(this.client.getServerURL());
	this.register(true);
	
	if (this.remoteRegisterAllOnConnect)
		this.remoteRegisterRoutingMap();
	
	if (this.remoteIdentifyAllOnConnect)
		this.remoteIdentifyAll();
	
	ClientActionsManager.prototype.connected.call(this);
};

ClientMessageRouter.prototype.disconnected = function() {
	this.localRoutingMap = {};
	ClientActionsManager.prototype.disconnected.call(this);
};