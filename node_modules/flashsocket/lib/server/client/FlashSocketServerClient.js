var sys = require('sys');
var events = require('events');

var FlashSocketMessage = require('../../message/FlashSocketMessage');

FlashSocketServerClient = module.exports = function(stream)
{
	FlashSocketServerClient.$id ++;
	
	this.sessionId = this.generateId();
	this.messageBuffer = null;
	
	this.data = {};
	
	var _self = this;
	
	var dataFn;
	var errorFn;
	var closeFn;
	var endFn;
	var removeListenersFn;
	
	dataFn = function(data) {
		_self.readData(data);
	};
	
	errorFn = function(exc) {
		removeListenersFn();
		_self.emit("disconnect");
	};
	
	closeFn = function() {
		removeListenersFn();
		_self.emit("disconnect");
	};
	
	endFn = function(t) {
		removeListenersFn();
		stream.end();
		
		_self.emit("disconnect");
	};
	
	removeListenersFn = function() {
		stream.removeListener("data", dataFn);
		stream.removeListener("error", dataFn);
		stream.removeListener("close", closeFn);
		stream.removeListener("end", endFn);
	};
	
	stream.on("data", dataFn);
	stream.on('error', errorFn);
	stream.on("close", closeFn);
	stream.on("end", endFn);
		
	this.stream = stream;
};

FlashSocketServerClient.prototype = new events.EventEmitter();
FlashSocketServerClient.$id = 0;
/*
 * Reads stream data and process message.
 * 
 * @param {Buffer} data.
 * 
 */

FlashSocketServerClient.prototype.readData = function(data)
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
					else
						break;
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

FlashSocketServerClient.prototype.processData = function(messageData)
{
	var message = new FlashSocketMessage(messageData);
	this.emit("message", message);
};

/*
 * Returns {int} message data length.
 * 
 * return {int} length.
 */

FlashSocketServerClient.prototype.getMessageLength = function()
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
 * Send message to client if stream is writable.
 * 
 * Returns true if it's success and false if it's fail.
 * 
 * return {int} length.
 */

FlashSocketServerClient.prototype.send = function(message)
{
	if (this.stream.writable)
	{
		this.stream.write(message.getData());
		return true;
	}
	else
		return false;
};

FlashSocketServerClient.prototype.generateId = function()
{
	return "FSC." + FlashSocketServerClient.$id + "." + Math.random().toString().substr(2);
};