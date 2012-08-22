var sys = require('sys');
var FlashSocketMessage = require('../../../../message/FlashSocketMessage');

ServerActionMessageBuilder = module.exports = function(target)
{
	this.target = target;
	
	this.message = new FlashSocketMessage();
	this.messageHeader = {
		route: {
			sender: null,
			receiver: null
		},
		data: {
		}
	};
};

ServerActionMessageBuilder.prototype.build = function(action, body, senderRoute, receiverRoute)
{
	if (!action && !action.xtype)
		throw new Error("invalid action!");
	
	this.messageHeader.route.sender = senderRoute ? senderRoute : this.target.route;
	this.messageHeader.route.receiver = receiverRoute ? receiverRoute : this.target.receiverRoute;
	
	this.messageHeader.data.action = action;
	
	this.message.clear();
	this.message.setJSONHeader(this.messageHeader);
	
	if (body)
		this.message.setBody(body);
	
	return this.message;
};