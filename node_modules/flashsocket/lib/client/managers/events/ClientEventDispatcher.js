var sys = require('sys');
var events = require('events');

var ClientActionsManager = require('../actions/ClientActionsManager');
var FlashSocketMessage = require('../../../message/FlashSocketMessage');

var ClientEventMessageBuilder = require('../../builders/message/events/ClientEventMessageBuilder');

var ObjectRegister = require('../../../utils/register/ObjectRegister');

ClientEventDispatcher = module.exports = function(receiverRoute, eventMessageBuilder) 
{
	ClientActionsManager.call(this, receiverRoute);
	
	this.localListeners = new Array();
	this.socketListeners = new ObjectRegister();
	
	this.eventMessageBuilder = eventMessageBuilder ? eventMessageBuilder : new ClientEventMessageBuilder(this);
	
	var _self = this;
	
	this.addAction("DISPATCH_EVENT", function(message) {
		_self.$dispatchSocketEvent(message);
	});
	this.addAction("ADD_EVENT_LISTENER", function(message) {
		_self.$executeAddSocketEventListener(message);
	});
	this.addAction("REMOVE_EVENT_LISTENER", function(message) {
		_self.$executeRemoveSocketEventListener(message);
	});
	this.addAction("REMOVE_ALL_EVENT_LISTENERS", function(message) {
		_self.$executeRremoveAllSocketEventListeners(message);
	});
	this.addAction("REMOVE_ALL_EVENT_LISTENERS", function(message) {
		_self.$executeClearAllEventListeners(message);
	});
};

ClientEventDispatcher.prototype = new ClientActionsManager();
ClientEventDispatcher.prototype.dispatchSocketEvent = function(params)
{
	var event = params.event;
	var eventBody = params.eventBody;
	var receiver = params.receiver;
	var receivers = params.receivers;

	if (!event || !event.type)
	{
		sys.log("ClientEventDispatcher[dispatchSocketEvent]: Invalid socket event!");
		return false;
	}
	
	var type = event.type;
	
	sys.log("1.$ClientEventDispatcher[0.dispatchSocketEvent]["+event.type+"]: " + receiver + ":" + this.socketListeners.exist([type]));
	
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
			
			sys.log("2.$ClientEventDispatcher[0.dispatchSocketEvent]["+event.type+"]: " + receivers);
			
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

ClientEventDispatcher.prototype.$dispatchSocketEvent = function(message)
{
	var header = message.getJSONHeader();
	var event = this.getActionData(message);
	
	sys.log("ClientEventDispatcher[$dispatchSocketEvent]" + event.type);
	
	if (event)
		this.emit(event.type, event.data, message.getBody());
};

ClientEventDispatcher.prototype.addSocketEventListener = function(type, listener)
{
	this.addLocalSocketEventListener(type, listener);
	
	var message = this.eventMessageBuilder.buildAddEventListener(type);
	
	if (!message)
		throw new Error("Invalid socket message!");

	this.send(message);
	
	sys.log("ClientEventDispatcher[addSocketEventListener]:" + type);
};

ClientEventDispatcher.prototype.addLocalSocketEventListener = function(type, listener)
{
	if (!type || listener == null)
		throw new Error("Invalid type or listener!");
	
	sys.log("ClientEventDispatcher[addLocalSocketEventListener]:" + type);
	
	this.on(type, listener);
	this.localListeners.push({
		type: type, 
		listener: listener
	});
};

ClientEventDispatcher.prototype.$executeAddSocketEventListener = function(message) 
{
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
	
	sys.log("-ClientEventDispatcher[$executeAddSocketEventListener]-");
	
	this.$addSocketEventListener(sender, type);
};

ClientEventDispatcher.prototype.$addSocketEventListener = function(target, type) 
{
	sys.log("-ClientEventDispatcher[$addSocketEventListener]-");
	
	if (target && type)
	{
		var regPath = [type].concat(target);
		var listener = this.socketListeners.read(regPath);
		
		if (!listener)
			this.socketListeners.register(regPath, {total: 1});
		else
			listener.total ++; 
		
		sys.log("-ClientEventDispatcher[$addSocketEventListener]["+this.socketListeners.read(regPath).total+"]["+this.socketListeners.read([type])+"]:" + regPath);
	}
	else
		sys.log("-ClientEventDispatcher[$addSocketEventListener]: Invalid parameters!");
};

ClientEventDispatcher.prototype.registerSocketEventListener = function(type)
{
	this.registerLocalSocketEventListener(type);
	
	var message = this.eventMessageBuilder.buildAddEventListener(type);
	this.send(message);
	
	sys.log("ClientEventDispatcher[registerSocketEventListener]:" + type);
};

ClientEventDispatcher.prototype.registerLocalSocketEventListener = function(type)
{
	if (!type)
		throw new Error("Invalid type!");
	
	sys.log("ClientEventDispatcher[registerLocalSocketEventListener]:" + type);
	
	this.localListeners.push({
		type: type, 
		listener: null
	});
};

ClientEventDispatcher.prototype.removeSocketEventListener = function(type, listener)
{
	var index = this.removeLocalSocketEventListener(type, listener);
	
	if (index != -1)
	{
		sys.log("ClientEventDispatcher[removeSocketEventListener]: " + type);
		
		var message = this.eventMessageBuilder.buildRemoveEventListener(type);
		
		this.removeListener(type, listener);
		this.send(message);
	}
	else
		sys.log("ClientEventDispatcher[removeSocketEventListener]: Listener not exist! " + type);
};

ClientEventDispatcher.prototype.removeLocalSocketEventListener = function(type, listener)
{
	if (!type || listener == null)
		throw new Error("Invalid type or listener!");
	
	sys.log("ClientEventDispatcher[removeLocalSocketEventListener]: " + type);
	
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

ClientEventDispatcher.prototype.$executeRemoveSocketEventListener = function(message) 
{
	sys.log("-ClientEventDispatcher[$executeRemoveSocketEventListener]-");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
	
	this.$removeSocketEventListener(sender, type);
};

ClientEventDispatcher.prototype.$removeSocketEventListener = function(target, type) 
{
	sys.log("-ClientEventDispatcher[$removeSocketEventListener]-");
	
	if (target && type)
	{
		var regPath = [type].concat(target);
		var listener = this.socketListeners.read(regPath);
		
		if (listener)
		{
			listener.total --;
			
			sys.log("ClientEventDispatcher[2.$removeSocketEventListener]["+listener.total+"]:" + listener+":"+regPath);
			
			if (listener.total == 0)
				this.socketListeners.unregister(regPath);
		}
		else
			sys.log("ClientEventDispatcher[1.$removeSocketEventListener]: Listener not exist! ... " + regPath);
	}
	else
		sys.log("ClientEventDispatcher[$removeSocketEventListener]: Invalid parameters!");
};

ClientEventDispatcher.prototype.removeAllSocketEventListeners = function(type)
{
	this.removeAllLocalSocketEventListeners(type);
	
	var message = this.eventMessageBuilder.buildRemoveAllEventListeners(type ? type : null);
	this.send(message);
};

ClientEventDispatcher.prototype.removeAllLocalSocketEventListeners = function(type)
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

ClientEventDispatcher.prototype.$executeRremoveAllSocketEventListeners = function(message) 
{
	sys.log("1.ClientEventDispatcher[$executeRremoveAllSocketEventListeners]");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	var event = this.getActionData(message);
	var type = event ? event.type : null;
		
	this.$removeAllSocketEventListeners(sender, type);
};

ClientEventDispatcher.prototype.$removeAllSocketEventListeners = function(target, type) 
{
	sys.log("1.ClientEventDispatcher[$removeAllSocketEventListeners]");
	
	if (type)
		this.socketListeners.remove([type].concat(target));
	else
		this.socketListeners.removeByPattern(["*"].concat(target));
};

ClientEventDispatcher.prototype.unregisterSocketEventListener = function(type)
{
	var index = this.unregisterLocalSocketEventListener(type);
	
	if (index != -1)
	{
		sys.log("ClientEventDispatcher[unregisterSocketEventListener]: " + type);
		
		var message = this.eventMessageBuilder.buildRemoveEventListener(type);
		
		this.send(message);
	}
	else
		sys.log("ClientEventDispatcher[unregisterSocketEventListener]: Listener not exist! " + type);
};

ClientEventDispatcher.prototype.unregisterLocalSocketEventListener = function(type)
{
	if (!type)
		throw new Error("Invalid type!");
	
	sys.log("ClientEventDispatcher[unregisterLocalSocketEventListener]: " + type);
	
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

ClientEventDispatcher.prototype.$executeClearAllEventListeners = function(message)
{
	sys.log("ClientEventDispatcher[$executeClearAllEventListeners]:");
	
	var header = message.getJSONHeader();
	var sender = header.route.sender;
	
	this.$removeAllSocketEventListeners(sender);
};

ClientEventDispatcher.prototype.clearAllEventListeners = function()
{
	var receivers = this.socketListeners.buildMap([], 1, true);
	var receiver;
	var message;
	
	sys.log("ClientEventDispatcher[clearAllEventListeners]: " + (receivers ? receivers.length : "NULL"));
	
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

ClientEventDispatcher.prototype.beforeRemove = function() 
{
	if (this.online())
		this.clearAllEventListeners();
};

ClientEventDispatcher.prototype.disconnected = function() 
{
	sys.log("-ClientEventDispatcher[disconnected]-");
	
	this.removeAllLocalSocketEventListeners();
	this.socketListeners.clear();
	
	ClientActionsManager.prototype.disconnected.call(this);
};