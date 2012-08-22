var sys = require('sys');

var ClientSocketUnit = require('../../base/ClientSocketUnit');
var ClientActionMessageBuilder = require('../../builders/message/actions/ClientActionMessageBuilder');

ClientActionsManager = module.exports = function() 
{
	ClientSocketUnit.call(this);
	
	this.actions = new Array();
	this.actionMessageBuilder = new ClientActionMessageBuilder(this);
	
	var _self = this;
	
	this.addAction("IDENTIFY_UNIT_RESULT", function(message) {
		_self.executeIdentify(message);
	});
};

ClientActionsManager.prototype = new ClientSocketUnit();
ClientActionsManager.prototype.processActions = function(message)
{
	var header = message.getJSONHeader();
	var xtype = header && header.data && header.data.action && header.data.action.xtype ? header.data.action.xtype : null;
	var data = xtype ? header.data.action.data : null;
	
	if (xtype && this.actions[xtype] != null)
	{
		this.actions[xtype](message, data);
		return true;
	}
	
	return false;
};

ClientActionsManager.prototype.getActionXType = function(message)
{
	var header = message.getJSONHeader();
	
	return header && header.data && header.data.action ? header.data.action.xtype : null;
};

ClientActionsManager.prototype.getActionData = function(message)
{
	var header = message.getJSONHeader();
	
	return header && header.data && header.data.action ? header.data.action.data : null;
};

ClientActionsManager.prototype.addAction = function(name, callback)
{
	this.actions[name] = callback;
};

ClientActionsManager.prototype.removeAction = function(name)
{
	delete(this.actions[name]);
};

ClientActionsManager.prototype.sendAction = function(params)
{
	var xtype = params.xtype;
	var data = params.data;
	var body = params.body;
	var sender = params.sender;
	var receiver = params.receiver;
	var receivers = params.receivers;
	var message;
	
	if (receiver)
	{
		message = this.actionMessageBuilder.build({
			xtype: xtype,
			data: data
		}, body, sender, receiver);
		
		this.send(message);
	}
	else
	if (receivers && receivers.length > 0)
	{
		while (receivers.length > 0)
		{
			message = this.actionMessageBuilder.build({
				xtype: xtype,
				data: data
			}, body, sender, receivers.shift());
			
			this.send(message);
		}
	}
	else
	if (this.receiverRoute)
	{
		message = this.actionMessageBuilder.build({
			xtype: xtype,
			data: data
		}, body, sender);
		
		this.send(message);
	}
};

ClientActionsManager.prototype.executeIdentify = function(message)
{
	var header = message.getJSONHeader();
	var action = header.data.action;
	
	if (action && action.data && action.data.route)
		this.receiverRoute = action.data.route;
};