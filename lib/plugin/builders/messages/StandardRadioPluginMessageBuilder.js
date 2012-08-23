var fs = require('fs');
var sys = require('sys');

var FlashSocketMessage = require('flashsocket-js').FlashSocketMessage;

StandardRadioPluginMessageBuilder = module.exports = function(target)
{
	this.target = target;
	
	this.message = new FlashSocketMessage();
	this.messageData = {
			route: {
				sender: this.target.route,
				receiver: null
			},
			data: {
				token: this.target.token,
				action: {
					xtype: "BROADCAST_AUDIO_DATA"
				}
			}
		};
};

StandardRadioPluginMessageBuilder.prototype.prepareBADMessage = function(data)
{
	this.messageData.data.action.xtype = "BROADCAST_AUDIO_DATA";
	this.message.setBody(data);
};

StandardRadioPluginMessageBuilder.prototype.buildBADMessage = function(receiver)
{
	this.messageData.route.receiver = receiver;
	this.message.setJSONHeader(this.messageData);
	
	return this.message;
};

StandardRadioPluginMessageBuilder.prototype.clearBADMessage = function()
{
	this.message.clearBody();
};


StandardRadioPluginMessageBuilder.prototype.prepareAIDMessage = function(data)
{
	this.messageData.data.action.xtype = "AUDIO_INFO_DATA";
	this.message.setBody(data);
};

StandardRadioPluginMessageBuilder.prototype.buildAIDMessage = function(receiver)
{
	this.messageData.route.receiver = receiver;
	this.message.setJSONHeader(this.messageData);
	
	return this.message;
};

StandardRadioPluginMessageBuilder.prototype.clearAIDMessage = function()
{
	this.message.clearBody();
};

StandardRadioPluginMessageBuilder.prototype.prepareCLMessage = function()
{
	this.messageData.data.action.xtype = "CONNECTION_LOST";
};

StandardRadioPluginMessageBuilder.prototype.buildCLMessage = function(receiver)
{
	this.messageData.route.receiver = receiver;
	this.message.setJSONHeader(this.messageData);
	
	return this.message;
};

StandardRadioPluginMessageBuilder.prototype.clearCLMessage = function()
{
	this.message.clearBody();
};