var sys = require('sys');

var flashsocket = require('flashsocket-js');
var ServerEventDispatcher = flashsocket.ServerEventDispatcher;
var ObjectRegister = flashsocket.ObjectRegister;

var StandardRadioPluginMessageBuilder = require('./builders/messages/StandardRadioPluginMessageBuilder');

StandardRadioPlugin = module.exports = function()
{
	ServerEventDispatcher.call(this);
	
	this.broadcasterClient = null;
	this.audioInfoData = null;
	this.listeners = new ObjectRegister();
	
	var _self = this;
	
	this.standaRdradioPluginMessageBuilder = new StandardRadioPluginMessageBuilder(this);
	
	this.addAction("BROADCAST_AUDIO_DATA", function(client, message) {
		_self.executeBroadacstAudioData(client, message);
	});
	
	this.addAction("SET_AUDIO_INFO_DATA", function(client, message) {
		_self.executeSetAudioInfoData(client, message);
	});
	
	this.addAction("BIND_LISTENER", function(client, message) {
		_self.executeBindListener(client, message);
	});
	
	this.addAction("UNBIND_LISTENER", function(client, message) {
		_self.executeUnbindListener(client, message);
	});
	
	this.addAction("DESTROY", function(client, message) {
		_self.executeDestroy(client, message);
	});
};

StandardRadioPlugin.prototype = new ServerEventDispatcher();
StandardRadioPlugin.prototype.prepare = function(data, client)
{
	sys.log("StandardRadioPlugin[prepare]: " + data + ":" + client);
	
	this.broadcasterClient = client;
	this.emit("ready", {broadcasterRoute: this.route});
};

StandardRadioPlugin.prototype.executeBroadacstAudioData = function(client, message)
{
	sys.log("StandardRadioPlugin[executeBroadcast]: ");
	
	if (this.listeners.total > 0)
	{
		var receivers = this.listeners.buildObjectsMap();
		var receiver;
		var message;
		
		this.standaRdradioPluginMessageBuilder.prepareBADMessage(message.getBody());
		
		while (receivers.length > 0)
		{
			receiver = receivers.shift();
			message = this.standaRdradioPluginMessageBuilder.buildBADMessage(receiver);
			
			this.send(message);
		}
		
		this.standaRdradioPluginMessageBuilder.clearBADMessage();
	}
};

StandardRadioPlugin.prototype.executeSetAudioInfoData = function(client, message)
{
	sys.log("-StandardRadioPlugin[executeSetAudioInfoData]-");
	
	var body = message.getJSONBody();
	
	this.audioInfoData = body.audioInfoData;
	this.broadcastAudioInfoData();
};

StandardRadioPlugin.prototype.broadcastAudioInfoData = function()
{
	sys.log("-StandardRadioPlugin[broadcastAudioInfoData]-");
	
	if (this.listeners.total > 0)
	{
		var receivers = this.listeners.buildObjectsMap();
		var receiver;
		var message;
		
		this.standaRdradioPluginMessageBuilder.prepareAIDMessage(this.audioInfoData);
		
		while (receivers.length > 0)
		{
			receiver = receivers.shift();
			message = this.standaRdradioPluginMessageBuilder.buildAIDMessage(receiver);
			
			this.send(message);
		}
		
		this.standaRdradioPluginMessageBuilder.clearAIDMessage();
	}
};

StandardRadioPlugin.prototype.broadcastConnectionLost = function()
{
	sys.log("-StandardRadioPlugin[broadcastConnectionLost]-");
	
	if (this.listeners.total > 0)
	{
		var receivers = this.listeners.buildObjectsMap();
		var receiver;
		var message;
		
		this.standaRdradioPluginMessageBuilder.prepareCLMessage();
		
		while (receivers.length > 0)
		{
			receiver = receivers.shift();
			message = this.standaRdradioPluginMessageBuilder.buildCLMessage(receiver);
			
			this.send(message);
		}
		
		this.standaRdradioPluginMessageBuilder.clearCLMessage();
	}
};

StandardRadioPlugin.prototype.executeBindListener = function(client, message)
{
	sys.log("-StandardRadioPlugin[executeBindListener]-");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	this.listeners.register(sender, {client: client});
	this.broadcastAudioInfoData();
};

StandardRadioPlugin.prototype.executeUnbindListener = function(client, message)
{
	sys.log("-StandardRadioPlugin[executeUnbindListener]-");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	this.listeners.unregister(sender);
};

StandardRadioPlugin.prototype.executeDestroy = function(client, message)
{
	sys.log("-StandardRadioPlugin[executeDestroy]-");
	
	this.broadcastConnectionLost();
	this.destroy();
};

StandardRadioPlugin.prototype.destroy = function()
{
	sys.log("-StandardRadioPlugin[destroy]-");
	
	this.listeners.clear();
	this.emit("destroy");
};

StandardRadioPlugin.prototype.disconnected = function(client)
{
	if (this.broadcasterClient == client)
		this.broadcastConnectionLost();
	
	if (this.listeners.exist(client.data.route))
		this.listeners.unregister(client.data.route);
	
	ServerEventDispatcher.prototype.disconnected.call(this, client);
	
	if (this.broadcasterClient == client)
		this.destroy();
};