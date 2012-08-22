var sys = require('sys');
var events = require('events');

var ServerActionsManager = require('../actions/ServerActionsManager');
var FlashSocketMessage = require('../../../message/FlashSocketMessage');

var ServerEventMessageBuilder = require('../../builders/message/events/ServerEventMessageBuilder');

var ObjectRegister = require('../../../utils/register/ObjectRegister');

ServerEventDispatcher = module.exports = function(receiverRoute, eventMessageBuilder) 
{
	ServerActionsManager.call(this, receiverRoute);
	
	this.localListeners = new Array();
	this.socketListeners = new ObjectRegister();
	
	this.eventMessageBuilder = eventMessageBuilder ? eventMessageBuilder : new ServerEventMessageBuilder(this);
	
	var _self = this;
	
	this.addAction("DISPATCH_EVENT", function(client, message) {
		_self.$dispatchSocketEvent(client, message);
	});
	this.addAction("ADD_EVENT_LISTENER", function(client, message) {
		_self.$executeAddSocketEventListener(client, message);
	});
	this.addAction("REMOVE_EVENT_LISTENER", function(client, message) {
		_self.$executeRemoveSocketEventListener(client, message);
	});
	this.addAction("REMOVE_ALL_EVENT_LISTENERS", function(client, message) {
		_self.$executeRremoveAllSocketEventListeners(client, message);
	});
	this.addAction("REMOVE_ALL_EVENT_LISTENERS", function(client, message) {
		_self.$executeClearAllEventListeners(client, message);
	});
};

ServerEventDispatcher.prototype = new ServerActionsManager();
ServerEventDispatcher.prototype.dispatchSocketEvent = function(params)
{
	var event = params.event;
	var eventBody = params.eventBody;
	var client = params.client;
	var receiver = params.receiver;
	var receivers = params.receivers;

	if (!event || !event.type)
	{
		sys.log("ServerEventDispatcher[dispatchSocketEvent]: Invalid socket event!");
		return false;
	}
	
	var type = event.type;
	
	sys.log("1.$ServerEventDispatcher[0.dispatchSocketEvent]["+event.type+"]: " + receiver + ":" + this.socketListeners.exist([type]));
	
	if (this.socketListeners.exist([type]))
	{
		if (receiver)
		{
			if (this.socketListeners.exist([type].concat(receiver)))
			{
				var message = this.eventMessageBuilder.buildDispatchEvent(); // new FlashSocketMessage();
				
				if (eventBody)
					message.setBody(eventBody);
				
				this.eventMessageBuilder.prepareDispatchEventBuild(event, receiver);
				this.send(message);
				
				return true;
			}
		}
		else
		if (client)
		{
			var receivers = this.socketListeners.buildMap([type].concat(client.data.route), 1);
			
			if (receivers.length > 0)
			{
				var message = this.eventMessageBuilder.buildDispatchEvent();
				
				if (eventBody)
					message.setBody(eventBody);
				
				while (receivers.length > 0)
				{
					var receiver = receivers.shift();
					
					this.eventMessageBuilder.prepareDispatchEventBuild(event, receiver);
					client.send(message);
				}
				
				return true;
			}
		}
		else
		if (receivers)
		{
			if (receivers.length > 0)
			{
				var message = this.eventMessageBuilder.buildDispatchEvent();
				
				if (eventBody)
					message.setBody(eventBody);
				
				while (receivers.length > 0)
				{
					var receiver = receivers.shift();
					
					this.eventMessageBuilder.prepareDispatchEventBuild(event, receiver);
					this.send(message);
				}
				
				return true;
			}
		}
		else
		{
			var receivers = this.socketListeners.buildMap([type], 1);
			
			if (receivers.length > 0)
			{
				var message = this.eventMessageBuilder.buildDispatchEvent();
				
				if (eventBody)
					message.setBody(eventBody);
				
				while (receivers.length > 0)
				{
					var receiver = receivers.shift();
					
					this.eventMessageBuilder.prepareDispatchEventBuild(event, receiver);
					this.send(message);
				}
				
				return true;
			}
		}
	}
	
	return false; 
};

ServerEventDispatcher.prototype.$dispatchSocketEvent = function(client, message)
{
	var event = this.getActionData(message);
	
	sys.log("ServerEventDispatcher[$dispatchSocketEvent]" + event.type);
	
	if (event)
		this.emit(event.type, event.data, message.getBody());
};

ServerEventDispatcher.prototype.addSocketEventListener = function(type, listener)
{
	this.addLocalSocketEventListener(type, listener);
	
	var message = this.eventMessageBuilder.buildAddEventListener(type);
	
	if (!message)
		throw new Error("Invalid socket message!");

	this.send(message);
	
	sys.log("ServerEventDispatcher[addSocketEventListener]:", type);
};

ServerEventDispatcher.prototype.addLocalSocketEventListener = function(type, listener)
{
	if (!type || listener == null)
		throw new Error("Invalid type or listener!");
	
	sys.log("ServerEventDispatcher[addLocalSocketEventListener]:", type);
	
	this.on(type, listener);
	this.localListeners.push({
		type: type, 
		listener: listener
	});
};

ServerEventDispatcher.prototype.$executeAddSocketEventListener = function(client, message) 
{
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
	
	sys.log("-ServerEventDispatcher[$executeAddSocketEventListener]-");
	
	this.$addSocketEventListener(sender, type);
};

ServerEventDispatcher.prototype.$addSocketEventListener = function(target, type) 
{
	sys.log("-ServerEventDispatcher[$addSocketEventListener]-");
	
	if (target && type)
	{
		var regPath = [type].concat(target);
		var listener = this.socketListeners.read(regPath);
		
		if (!listener)
			this.socketListeners.register(regPath, {total: 1});
		else
			listener.total ++; 
		
		sys.log("-ServerEventDispatcher[$addSocketEventListener]["+this.socketListeners.read(regPath).total+"]["+this.socketListeners.read([type])+"]:" + regPath);
	}
	else
		sys.log("-ServerEventDispatcher[$addSocketEventListener]: Invalid parameters!");
};

ServerEventDispatcher.prototype.registerSocketEventListener = function(type)
{
	this.registerLocalSocketEventListener(type);
	
	var message = this.eventMessageBuilder.buildAddEventListener(type);
	this.send(message);
	
	sys.log("ServerEventDispatcher[registerSocketEventListener]:", type);
};

ServerEventDispatcher.prototype.registerLocalSocketEventListener = function(type)
{
	if (!type)
		throw new Error("Invalid type!");
	
	sys.log("ServerEventDispatcher[registerLocalSocketEventListener]:", type);
	
	this.localListeners.push({
		type: type, 
		listener: null
	});
};

ServerEventDispatcher.prototype.removeSocketEventListener = function(type, listener)
{
	var index = this.removeLocalSocketEventListener(type, listener);
	
	if (index != -1)
	{
		sys.log("ServerEventDispatcher[removeSocketEventListener]: " + type);
		
		var message = this.eventMessageBuilder.buildRemoveEventListener(type);
		
		this.removeListener(type, listener);
		this.send(message);
	}
	else
		sys.log("ServerEventDispatcher[removeSocketEventListener]: Listener not exist! " + type);
};

ServerEventDispatcher.prototype.removeLocalSocketEventListener = function(type, listener)
{
	if (!type || listener == null)
		throw new Error("Invalid type or listener!");
	
	sys.log("ServerEventDispatcher[removeLocalSocketEventListener]: " + type);
	
	var index = -1;
	
	for (var i = 0;i < this.localListeners.length;i ++)
		if (type == this.localListeners[i].type && listener == this.localListeners[i].listener)
		{
			index = i;
			
			this.localListeners.splice(index, 1);
			break ;
		}
	
	return index;
};

ServerEventDispatcher.prototype.$executeRemoveSocketEventListener = function(client, message) 
{
	sys.log("-ServerEventDispatcher[$executeRemoveSocketEventListener]-");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
	
	this.$removeSocketEventListener(sender, type);
};

ServerEventDispatcher.prototype.$removeSocketEventListener = function(target, type) 
{
	sys.log("-ServerEventDispatcher[$removeSocketEventListener]-");
	
	if (target && type)
	{
		var regPath = [type].concat(target);
		var listener = this.socketListeners.read(regPath);
		
		if (listener)
		{
			listener.total --;
			
			sys.log("ServerEventDispatcher[2.$removeSocketEventListener]["+listener.total+"]:" + listener+":"+regPath);
			
			if (listener.total == 0)
				this.socketListeners.unregister(regPath);
		}
		else
			sys.log("ServerEventDispatcher[1.$removeSocketEventListener]: Listener not exist! ... " + regPath);
	}
	else
		sys.log("ServerEventDispatcher[$removeSocketEventListener]: Invalid parameters!");
};

ServerEventDispatcher.prototype.removeAllSocketEventListeners = function(type)
{
	this.removeAllLocalSocketEventListeners(type);
	
	var message = this.eventMessageBuilder.buildRemoveAllEventListeners(type ? type : null);
	this.send(message);
};

ServerEventDispatcher.prototype.removeAllLocalSocketEventListeners = function(type)
{
	if (type)
	{
		var i = this.localListeners.length;
		
		while (i > 0)
		{
			i --;
			
			if (this.localListeners[i].type == type)
				this.localListeners.splice(i, 1);
		}
	}
	else
		while (this.localListeners.length > 0)
		{
			var event = this.localListeners.shift();
			this.removeListener(event.type, event.listener);
		}
};

ServerEventDispatcher.prototype.$executeRremoveAllSocketEventListeners = function(client, message) 
{
	sys.log("1.ServerEventDispatcher[$executeRremoveAllSocketEventListeners]");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
		
	this.$removeAllSocketEventListeners(sender, type);
};

ServerEventDispatcher.prototype.$removeAllSocketEventListeners = function(target, type) 
{
	sys.log("1.ServerEventDispatcher[$removeAllSocketEventListeners]");
	
	if (type)
		this.socketListeners.remove([type].concat(target));
	else
		this.socketListeners.removeByPattern(["*"].concat(target));
};

ServerEventDispatcher.prototype.unregisterSocketEventListener = function(type)
{
	var index = this.unregisterLocalSocketEventListener(type);
	
	if (index != -1)
	{
		sys.log("ServerEventDispatcher[unregisterSocketEventListener]: " + type);
		
		var message = this.eventMessageBuilder.buildRemoveEventListener(type);
		
		this.send(message);
	}
	else
		sys.log("ServerEventDispatcher[unregisterSocketEventListener]: Listener not exist! " + type);
};

ServerEventDispatcher.prototype.unregisterLocalSocketEventListener = function(type)
{
	if (!type)
		throw new Error("Invalid type!");
	
	sys.log("ServerEventDispatcher[unregisterLocalSocketEventListener]: " + type);
	
	var index = -1;
	
	for (var i = 0;i < this.localListeners.length;i ++)
		if (type == this.localListeners[i].type)
		{
			index = i;
			
			this.localListeners.splice(index, 1);
			break ;
		}
	
	return index;
};

ServerEventDispatcher.prototype.$executeClearAllEventListeners = function(client, message)
{
	sys.log("ServerEventDispatcher[$executeClearAllEventListeners]:");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	this.$removeAllSocketEventListeners(sender);
};

ServerEventDispatcher.prototype.clearAllEventListeners = function()
{
	var receivers = this.socketListeners.buildMap([], 1, true);
	var receiver;
	var message;
	
	sys.log("ServerEventDispatcher[clearAllEventListeners]: " + (receivers ? receivers.length : 0));
	
	if (receivers)
		while (receivers.length > 0)
		{
			receiver = receivers.shift();
			message = this.eventMessageBuilder.buildClearAllEventListeners(receiver);
			
			this.send(message);
		}
	
	this.removeAllLocalSocketEventListeners();
	this.socketListeners.clear();
};

//************************************************************************************************************************
//************************************************************************************************************************

ServerEventDispatcher.prototype.beforeRemove = function() 
{
	if (this.online())
		this.clearAllEventListeners();
	
	ServerActionsManager.prototype.beforeRemove.call(this);
};

ServerEventDispatcher.prototype.disconnected = function(client) 
{
	if (this.receiverRoute)
	{
		var r = [].concat(this.receiverRoute).splice(0, 2);
		
		if (r.join(",") == client.data.route.join(","))
		{
			while (this.localListeners.length > 0)
			{
				var event = this.localListeners.shift();
				
				if (event.listener != null)
					this.removeListener(event.type, event.listener);
			}
		}
	}
	
	this.socketListeners.removeByPattern(["*"].concat(client.data.route));
	ServerActionsManager.prototype.disconnected.call(this, client);
};