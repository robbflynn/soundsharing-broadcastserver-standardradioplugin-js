var sys = require('sys');
var FlashSocketMessage = require('../../../../message/FlashSocketMessage');

ServerEventMessageBuilder = module.exports = function(target)
{
	this.target = target;
	
	this.message = new FlashSocketMessage();
	this.messageHeader = {
		route: {
			sender: null,
			receiver: null
		},
		data: {
			action: {
				xtype: null,
				data: {
					type: null
				}
			}
		}
	};
	
	this.dispatchEventMessage = new FlashSocketMessage();
	this.dispatchEventMessageHeader = {
		route: {
			sender: null,
			receiver: null
		},
		data: {
			action: {
				xtype: "DISPATCH_EVENT",
				data: null
			}
		}
	};
};

ServerEventMessageBuilder.prototype.build = function(xtype, eventType, receiverRoute)
{
	if (!xtype || !eventType)
		return null;
	
	this.messageHeader.route.sender = this.target.route;
	this.messageHeader.route.receiver = receiverRoute ? receiverRoute : this.target.receiverRoute;
	
	this.messageHeader.data.action.xtype = xtype;
	this.messageHeader.data.action.data.type = eventType;
	
	this.message.setJSONHeader(this.messageHeader);
	
	return this.message;
};

ServerEventMessageBuilder.prototype.buildDispatchEvent = function()
{
	this.dispatchEventMessageHeader.route.sender = this.target.route;
	this.dispatchEventMessage.clearBody();
	
	return this.dispatchEventMessage;
};

ServerEventMessageBuilder.prototype.prepareDispatchEventBuild = function(event, receiver)
{
	this.dispatchEventMessageHeader.route.receiver = receiver ? receiver : this.target.receiverRoute;
	this.dispatchEventMessageHeader.data.action.data = event;
	
	this.dispatchEventMessage.setJSONHeader(this.dispatchEventMessageHeader);
};

ServerEventMessageBuilder.prototype.buildAddEventListener = function(type)
{
	return this.build("ADD_EVENT_LISTENER", type);
};

ServerEventMessageBuilder.prototype.buildRemoveEventListener = function(type)
{
	return this.build("REMOVE_EVENT_LISTENER", type);
};

ServerEventMessageBuilder.prototype.buildRemoveAllEventListeners = function(type)
{
	return this.build("REMOVE_ALL_EVENT_LISTENERS", type);
};

ServerEventMessageBuilder.prototype.buildClearAllEventListeners = function(receiverRoute)
{
	return this.build("CLEAR_ALL_EVENT_LISTENERS", null, receiverRoute);
};