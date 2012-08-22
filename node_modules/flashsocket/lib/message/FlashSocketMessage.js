var sys = require('sys');

FlashSocketMessage = module.exports = function(buffer)
{
	this.jsonHeader = null;
	this.jsonBody = null;

	if (buffer)
		this.buffer = buffer;
	else
	{
		this.buffer = new Buffer("{#        #}");
		this.setHeaderLength(0);
		this.setBodyLength(0);
	}
};

// ****************************************************************************************************************
// 														HEADER
// ****************************************************************************************************************

/*
 * Sets header data, it's accept only Buffer object.
 * 
 * @param {Buffer} data.
 * 
 */


FlashSocketMessage.prototype.setHeader = function(data)
{
	if (!Buffer.isBuffer(data))
		throw new Error("Invalid buffer data");
	
	var headerLength = this.getHeaderLength();
	
	var startBuffer = this.buffer.slice(0, 10);
	var endBuffer = this.buffer.slice(10 + headerLength);
	
	this.jsonHeader = null;
	this.buffer = new Buffer(startBuffer.length + data.length + endBuffer.length);
	
	startBuffer.copy(this.buffer, 0);
	data.copy(this.buffer, startBuffer.length);
	endBuffer.copy(this.buffer, startBuffer.length + data.length);
	
	this.setHeaderLength(data.length);
};

/*
 * Returns {Buffer} data or null if there is no header data.
 * 
 * return {Buffer} Header data.
 */

FlashSocketMessage.prototype.getHeader = function()
{
	if (this.buffer && this.buffer.length > 12)
	{
		var headerLength = this.getHeaderLength();
		
		if (headerLength > 0)
			return this.buffer.slice(10, 10 + headerLength);
	}
	
	return null;
};

/*
 * Sets header data length.
 * 
 * @param {int} l.
 */

FlashSocketMessage.prototype.setHeaderLength = function(l)
{
   this.buffer[2] = l >> 24;
   this.buffer[3] = l >> 16;
   this.buffer[4] = l >> 8;
   this.buffer[5] = l;
};

/*
 * Returns {int} header data length.
 * 
 * return {int} length.
 */

FlashSocketMessage.prototype.getHeaderLength = function()
{
	if (this.buffer)
	{
		var l = 0;
	    
	    l |= this.buffer[2] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[3] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[4] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[5] & 0xFF;
	    
	    return l;
	}

	return 0;
};

/*
 * Returns JSON decoded header object and cache it. 
 * getJSONHeader will return cached object until new header is set by setHeader.
 * Returns null if JSON encoded object can't be decoded or it's null.
 * 
 * return {Object} Header object.
 */

FlashSocketMessage.prototype.getJSONHeader = function()
{
	try
	{
		if (!this.jsonHeader)
			this.jsonHeader = JSON.parse(this.getHeader().toString('utf8'));
		
		return this.jsonHeader;
	}
	catch(err) {}
	
	return null;
};

FlashSocketMessage.prototype.setJSONHeader = function(obj)
{
	if (obj)
		this.setHeader(new Buffer(JSON.stringify(obj)));
	else
		this.setHeader(new Buffer());
		
	this.jsonHeader = obj;
};

// ****************************************************************************************************************
// 														BODY
// ****************************************************************************************************************

/*
 * Sets body data, it's accept only Buffer object.
 * 
 * @param {Buffer} data.
 * 
 */

FlashSocketMessage.prototype.setBody = function(data)
{
	if (!Buffer.isBuffer(data))
		throw new Error("Invalid buffer data");
	
	var headerLength = this.getHeaderLength();
	
	var startBuffer = this.buffer.slice(0, 10 + headerLength);
	var endBuffer = this.buffer.slice(this.buffer.length - 2);
	
	this.jsonBody = null;
	this.buffer = new Buffer(startBuffer.length + data.length + endBuffer.length);
	
	startBuffer.copy(this.buffer, 0);
	data.copy(this.buffer, startBuffer.length);
	endBuffer.copy(this.buffer, startBuffer.length + data.length);
	
	this.setBodyLength(data.length);
};

/*
 * Returns {Buffer} data or null if there is no body data.
 * 
 * return {Buffer} Body data.
 */

FlashSocketMessage.prototype.getBody = function()
{
	if (this.buffer && this.buffer.length > 12)
	{
		var headerLength = this.getHeaderLength();
		
		if (this.buffer.length - 12 > headerLength)
			return this.buffer.slice(10 + headerLength, this.buffer.length - 2);
	}
	
	return null;
};

/*
 * Sets body data length.
 * 
 * @param {int} l.
 */

FlashSocketMessage.prototype.setBodyLength = function(l)
{
   this.buffer[6] = l >> 24;
   this.buffer[7] = l >> 16;
   this.buffer[8] = l >> 8;
   this.buffer[9] = l;
};

/*
 * Returns {int} body data length.
 * 
 * return {int} length.
 */

FlashSocketMessage.prototype.getBodyLength = function()
{
	if (this.buffer)
	{
		var l = 0;
	    
	    l |= this.buffer[6] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[7] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[8] & 0xFF;
	    l <<= 8;
	    l |= this.buffer[9] & 0xFF;
	    
	    return l;
	}

	return 0;
};

/*
 * Returns JSON decoded body object and cache it. 
 * getJSONHeader will return cached object until new header is set by setBody.
 * Returns null if JSON encoded object can't be decoded or it's null.
 * 
 * return {Object} Header object.
 */

FlashSocketMessage.prototype.getJSONBody = function()
{
	try
	{
		if (!this.jsonBody)
			this.jsonBody = JSON.parse(this.getBody().toString('utf8'));
		
		return this.jsonBody;
	}
	catch(err) {}
	
	return null;
};

FlashSocketMessage.prototype.setJSONBody = function(obj)
{
	if (obj)
		this.setBody(new Buffer(JSON.stringify(obj)));
	else
		this.setBody(new Buffer());
		
	this.jsonBody = obj;
};

/*
 * Returns {int} message length.
 * 
 * return {int} length.
 */

FlashSocketMessage.prototype.getLength = function()
{
	return this.buffer ? this.buffer.length : 0;
};

/*
 * Returns {Buffer} raw message data.
 * 
 * return {Buffer} message data
 */

FlashSocketMessage.prototype.getData = function()
{
	return this.buffer;
};

FlashSocketMessage.prototype.clearHeader = function()
{
	this.setHeader(new Buffer(""));
};

FlashSocketMessage.prototype.clearBody = function()
{
	this.setBody(new Buffer(""));
};

FlashSocketMessage.prototype.clear = function()
{
	this.clearHeader();
	this.clearBody();
};;