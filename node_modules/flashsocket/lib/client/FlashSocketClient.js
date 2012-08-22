var sys = require('sys');
var net = require("net");
var events = require('events');

var FlashSocketMessage = require('../message/FlashSocketMessage');

FlashSocketClient = module.exports = function()
{
	FlashSocketClient.$id ++;
	
	this.sessionId = this.generateId();
	this.socket = new net.Socket();
	this.connected = false;
	
	this.messageBuffer = null;
	
	this.address = null;
	this.port = null;
	
	var _self = this;
	
	this.socket.on("connect", function(data) {
		_self.connected = true;
		_self.emit("connect");
	});
	
	this.socket.on("data", function(data) {
		_self.readData(data);
	});
	
	this.socket.on('error', function(exc) {
		sys.log("--- error ---");
		_self.connected = false;
		_self.emit("error", exc);
	});
	
	this.socket.on("close", function() {
		sys.log("--- close ---");
		_self.connected = false;
		_self.emit("disconnect");
	});
};

FlashSocketClient.prototype = new events.EventEmitter();
FlashSocketClient.$id = 0;

FlashSocketClient.prototype.connect = function(address, port)
{
	sys.log('[FlashSocketClient[connect](address="' + address + '", port="' + port + '")]');
	
	this.address = address;
	this.port = port;
	
	this.socket.connect(port, address);
};


/*
 * Reads stream data and process message.
 * 
 * @param {Buffer} data.
 * 
 */

FlashSocketClient.prototype.readData = function(data)
{
	if (!this.messageBuffer || this.messageBuffer.length == 0)
		this.messageBuffer = data;
	else
	{
		var md = this.messageBuffer;
	  	var l = md.length + data.length;
	  	
		this.messageBuffer = new Buffer(l);
		
		md.copy(this.messageBuffer, 0);
		data.copy(this.messageBuffer, md.length);
	}
	
	if (this.messageBuffer.length >= 12)
	{
		var ln = this.getMessageLength();
		
		if (ln <= this.messageBuffer.length)
		{
			while (true)
			{
				var messageData = this.messageBuffer.slice(0, ln);
				
				this.processData(messageData);
				
				if (messageData.length != this.messageBuffer.length)
				{
					this.messageBuffer = this.messageBuffer.slice(messageData.length);
					
					if (this.messageBuffer.length >= 12)
					{
						ln = this.getMessageLength();
						
						if (ln > this.messageBuffer.length)
							break;
					}
				}
				else
				{
					this.messageBuffer = null;
					break;
				}
			}
		}
	}
};


/*
 * Process message from stream data.
 */

FlashSocketClient.prototype.processData = function(messageData)
{
	var message = new FlashSocketMessage(messageData);
	this.emit("message", message);
};

/*
 * Returns {int} message data length.
 * 
 * return {int} length.
 */

FlashSocketClient.prototype.getMessageLength = function()
{
	if (this.messageBuffer)
	{
		var h = 0;
		var b = 0;
		
		// Header length
		h |= this.messageBuffer[2] & 0xFF;
	    h <<= 8;
	    h |= this.messageBuffer[3] & 0xFF;
	    h <<= 8;
	    h |= this.messageBuffer[4] & 0xFF;
	    h <<= 8;
	    h |= this.messageBuffer[5] & 0xFF;
	    
	    // Body length
	    b |= this.messageBuffer[6] & 0xFF;
	    b <<= 8;
	    b |= this.messageBuffer[7] & 0xFF;
	    b <<= 8;
	    b |= this.messageBuffer[8] & 0xFF;
	    b <<= 8;
	    b |= this.messageBuffer[9] & 0xFF;
		
		return h + b + 12;
	}

	return 0;
};

/*
 * Send message to server if socket is connected.
 * 
 * Returns true if it's success and false if it's fail.
 * 
 * return {int} length.
 */

FlashSocketClient.prototype.send = function(message)
{
	if (this.connected)
	{
		this.socket.write(message.getData());
		return true;
	}
	else
		return false;
};

FlashSocketClient.prototype.getServerURL = function()
{
	if (this.address)
		return this.port ? this.address + ":" + this.port : this.address;
	
	return null;
};

FlashSocketClient.prototype.generateId = function()
{
	return "FC." + FlashSocketClient.$id + "." + Math.random().toString().substr(2);
};