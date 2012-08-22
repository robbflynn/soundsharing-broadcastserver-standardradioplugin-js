var sys = require('sys');
var events = require('events');

ServerSocketUnit = module.exports = function(receiverRoute)
{
	this.id = ServerSocketUnit.generateId();
	
	this.parent = null;
	this.depth = 0;
	this.route = [this.id];
	this.receiverRoute = receiverRoute ? receiverRoute : null;
	
	this.units = new Array();
	this.unitsById = new Array();
	
	this.namespace = null;
	this.receiverNamespace = null;
};

ServerSocketUnit.prototype = new events.EventEmitter();
ServerSocketUnit.prototype.process = function(client, message) {
	
	var receiver = this.getMessageReceiver(message);
	
	if (this.depth < receiver.length)
	{
		var unitId = receiver[this.depth];
		
		if (this.id == unitId)
		{
			if (this.depth == receiver.length - 1)
				this.processActions(client, message);
			else
			{
				unitId = receiver[this.depth + 1];
				
				if (this.unitsById[unitId])
					this.unitsById[unitId].process(client, message);
			}
		}
	}
};

ServerSocketUnit.prototype.processActions = function(client, message) {
	
};

ServerSocketUnit.prototype.send = function(message) {
	if (this.parent)
		this.parent.send(message);
};

ServerSocketUnit.prototype.getMessageReceiver = function(message) {
	var header = message.getJSONHeader();
	return header && header.route ? header.route.receiver : null;
};

ServerSocketUnit.prototype.getMessageSender = function(message) {
	var header = message.getJSONHeader();
	return header && header.route ? header.route.sender : null;
};

ServerSocketUnit.prototype.addUnit = function(unit) {
	
	unit.beforeAdd();
	
	this.units.push(unit);
	this.unitsById[unit.id] = unit;
	
	unit.parent = this;
	unit.afterAdd();
};

ServerSocketUnit.prototype.beforeAdd = function() {
};

ServerSocketUnit.prototype.afterAdd = function() {
	this.updateRoute();
	this.updateDepth();
	
	if (this.online())
		this.register(true);
};

ServerSocketUnit.prototype.removeUnit = function(id) {
	var index = this.units.indexOf(this.unitsById[id]);
	var unit = this.units[index];
	
	unit.beforeRemove();
	
	this.units.splice(index, 1);
	this.unitsById[id].parent = null;
	
	delete(this.unitsById[id]);
	
	unit.afterRemove();
};

ServerSocketUnit.prototype.beforeRemove = function() {
	if (this.online())
		this.unregister(true);
};

ServerSocketUnit.prototype.afterRemove = function() {
};

ServerSocketUnit.prototype.getUnit = function(id) {
	return this.unitsById[id];
};

ServerSocketUnit.prototype.updateRoute = function() {
	this.route = this.parent ? this.parent.route.concat([this.id]) : [this.id];
	
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].updateRoute();
};

ServerSocketUnit.prototype.updateDepth = function() {
	this.depth = this.parent ? this.parent.depth + 1 : 0;
	
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].updateDepth();
};

ServerSocketUnit.prototype.identify = function(remoteRoutingMap, deep)
{
	if (!deep && !this.receiverNamespace)
		return ;
	
	if (remoteRoutingMap)
	{
		if (deep)
			this.$identifyChildren(remoteRoutingMap);
		else
		if (this.receiverNamespace && remoteRoutingMap.hasOwnProperty(this.receiverNamespace))
			this.receiverRoute = remoteRoutingMap[this.receiverNamespace];
	}
};

ServerSocketUnit.prototype.identifyChildren = function(remoteRoutingMap)
{
	if (remoteRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$identifyChildren(remoteRoutingMap);
};

ServerSocketUnit.prototype.$identifyChildren = function(remoteRoutingMap)
{
	if (remoteRoutingMap)
	{
		if (this.receiverNamespace && remoteRoutingMap.hasOwnProperty(this.receiverNamespace))
			this.receiverRoute = remoteRoutingMap[this.receiverNamespace];
		
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$identifyChildren(remoteRoutingMap);
	}
};

ServerSocketUnit.prototype.register = function(deep)
{
	if (!deep && !this.namespace)
		return ;
	
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
	{
		if (deep)
			this.$registerChildren(localRoutingMap);
		else
		{
			if (localRoutingMap[this.namespace])
				throw new Error("Unit namespace already exist!");
			else
				localRoutingMap[this.namespace] = this.route;
		}
	}
};

ServerSocketUnit.prototype.registerChildren = function()
{
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$registerChildren(localRoutingMap);
};

ServerSocketUnit.prototype.$registerChildren = function(localRoutingMap)
{
	if (localRoutingMap)
	{
		if (this.namespace)
		{
			if (localRoutingMap[this.namespace])
				throw new Error("Unit namespace already exist!");
			else
				localRoutingMap[this.namespace] = this.route;
		}
		
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$registerChildren(localRoutingMap);
	}
};

ServerSocketUnit.prototype.unregister = function(deep)
{
	if (!deep && !this.namespace)
		return ;
	
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
	{
		if (deep)
			this.$unregisterChildren(localRoutingMap);
		else
		if (localRoutingMap[this.namespace])
			delete(localRoutingMap[this.namespace]);
	}
};

ServerSocketUnit.prototype.unregisterChildren = function() {
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$unregisterChildren(localRoutingMap);
};

ServerSocketUnit.prototype.$unregisterChildren = function(localRoutingMap) {
	if (localRoutingMap)
	{
		if (this.namespace && localRoutingMap[this.namespace])
			delete localRoutingMap[this.namespace];
		
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$unregisterChildren(localRoutingMap);
	}
};

ServerSocketUnit.prototype.getLocalRoutingMap = function() {
	return this.parent ? this.parent.getLocalRoutingMap() : null;
};

ServerSocketUnit.prototype.setId = function(id) {
	
	var p = this.parent;
	
	if (p)
	{
		p.removeUnit(this.id);
		
		this.id = id;
		p.addUnit(this);
	}
	else
	{
		this.id = id;
		this.updateRoute();
	}
};

ServerSocketUnit.prototype.connected = function(client) {
	//sys.log("ServerSocketUnit[connected]: " + this.id);
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].connected(client);
};

ServerSocketUnit.prototype.disconnected = function(client) {
	//sys.log("ServerSocketUnit[disconnected]: " + this.id);
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].disconnected(client);
};

ServerSocketUnit.prototype.online = function() {
	if (this.parent)
		return this.parent.online();
	
	return false;
};

ServerSocketUnit.generateId = function() {
	ServerSocketUnit.$id ++;
	return "SU." + ServerSocketUnit.$id + "." + Math.random().toString().substr(2);
};

ServerSocketUnit.$id = 0;