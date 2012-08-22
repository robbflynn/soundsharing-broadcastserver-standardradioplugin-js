var sys = require('sys');

var ServerSocketUnit = require('../../base/ServerSocketUnit');
var ServerActionMessageBuilder = require('../../builders/message/actions/ServerActionMessageBuilder');

ServerActionsManager = module.exports = function() 
{
	ServerSocketUnit.call(this);
	
	this.actions = new Array();
	this.actionMessageBuilder = new ServerActionMessageBuilder(this);
};

ServerActionsManager.prototype = new ServerSocketUnit();
ServerActionsManager.prototype.processActions = function(client, message)
{
	var header = message.getJSONHeader();
	var xtype = header && header.data && header.data.action && header.data.action.xtype ? header.data.action.xtype : null;
	var data = xtype ? header.data.action.data : null;
	
	if (xtype && this.actions[xtype] != null)
	{
		this.actions[xtype](client, message, data);
		return true;
	}
	
	return false;
};

ServerActionsManager.prototype.getActionXType = function(message)
{
	var header = message.getJSONHeader();
	
	return header && header.data && header.data.action ? header.data.action.xtype : null;
};

ServerActionsManager.prototype.getActionData = function(message)
{
	var header = message.getJSONHeader();
	
	return header && header.data && header.data.action ? header.data.action.data : null;
};

ServerActionsManager.prototype.addAction = function(name, callback)
{
	this.actions[name] = callback;
};

ServerActionsManager.prototype.removeAction = function(name)
{
	delete(this.actions[name]);
};

ServerActionsManager.prototype.sendAction = function(params)
{
	var xtype = params.xtype;
	var data = params.data;
	var body = params.body;
	var sender = params.sender;
	var receiver = params.receiver;
	var receivers = params.receivers;
	var client = params.client;
	var message;
	
	if (receiver)
	{
		message = this.actionMessageBuilder.build({
			xtype: xtype,
			data: data
		}, body, sender, receiver);
		
		if (client)
			client.send(message);
		else
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