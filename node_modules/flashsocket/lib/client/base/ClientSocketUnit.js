var sys = require('sys');
var events = require('events');

ClientSocketUnit = module.exports = function(receiverRoute)
{
	this.id = ClientSocketUnit.generateId();
	
	this.parent = null;
	this.depth = 0;
	this.route = [this.id];
	this.receiverRoute = receiverRoute ? receiverRoute : null;
	
	this.units = new Array();
	this.unitsById = new Array();
	
	this.namespace = null;
	this.receiverNamespace = null;
};

ClientSocketUnit.prototype = new events.EventEmitter();
ClientSocketUnit.prototype.process = function(message) {
	
	var receiver = this.getMessageReceiver(message);
	
	if (receiver && this.depth < receiver.length)
	{
		var unitId = receiver[this.depth];
		
		if (this.id == unitId)
		{
			if (this.depth == receiver.length - 1)
				this.processActions(message);
			else
			{
				unitId = receiver[this.depth + 1];
				
				if (this.unitsById[unitId])
					this.unitsById[unitId].process(message);
			}
		}
	}
};

ClientSocketUnit.prototype.processActions = function(message) {
	
};

ClientSocketUnit.prototype.send = function(message) {
	if (this.parent)
		this.parent.send(message);
};

ClientSocketUnit.prototype.getMessageReceiver = function(message) {
	var header = message.getJSONHeader();
	return header && header.route ? header.route.receiver : null;
};

ClientSocketUnit.prototype.getMessageSender = function(message) {
	var header = message.getJSONHeader();
	return header && header.route ? header.route.sender : null;
};

ClientSocketUnit.prototype.addUnit = function(unit) {
	
	unit.beforeAdd();
	
	this.units.push(unit);
	this.unitsById[unit.id] = unit;
	
	unit.parent = this;
	unit.afterAdd();
};

ClientSocketUnit.prototype.beforeAdd = function() {
};

ClientSocketUnit.prototype.afterAdd = function() {
	this.updateRoute();
	this.updateDepth();
	
	if (this.online())
	{
		this.register(true);
		this.identify(true);
	}
};

ClientSocketUnit.prototype.removeUnit = function(id) {
	var index = this.units.indexOf(this.unitsById[id]);
	var unit = this.units[index];
	
	unit.beforeRemove();
	
	this.units.splice(index, 1);
	this.unitsById[id].parent = null;
	
	delete(this.unitsById[id]);
	
	unit.afterRemove();
};

ClientSocketUnit.prototype.beforeRemove = function() {
	if (this.online())
		this.unregister(true);
};

ClientSocketUnit.prototype.afterRemove = function() {
};

ClientSocketUnit.prototype.getUnit = function(id) {
	return this.unitsById[id];
};

ClientSocketUnit.prototype.updateRoute = function() {
	this.route = this.parent ? this.parent.route.concat([this.id]) : [this.id];
	
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].updateRoute();
};

ClientSocketUnit.prototype.updateDepth = function() {
	this.depth = this.parent ? this.parent.depth + 1 : 0;
	
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].updateDepth();
};

ClientSocketUnit.prototype.setId = function(id) {
	
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

ClientSocketUnit.prototype.identify = function(deep)
{
	if (!deep && !this.receiverNamespace)
		return ;
	
	var remoteRoutingMap = this.getRemoteRoutingMap();
	
	if (remoteRoutingMap)
	{
		if (deep)
			this.$identifyChildren(remoteRoutingMap);
		else
			this.$identify(remoteRoutingMap);
	}
};

ClientSocketUnit.prototype.identifyChildren = function()
{
	var remoteRoutingMap = this.getRemoteRoutingMap();
	
	if (remoteRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$identifyChildren(remoteRoutingMap);
};

ClientSocketUnit.prototype.$identify = function(remoteRoutingMap)
{
	if (remoteRoutingMap && this.receiverNamespace && remoteRoutingMap.hasOwnProperty(this.receiverNamespace))
		this.receiverRoute = remoteRoutingMap[this.receiverNamespace];
};

ClientSocketUnit.prototype.$identifyChildren = function(remoteRoutingMap)
{
	if (remoteRoutingMap)
	{
		if (this.receiverNamespace && remoteRoutingMap.hasOwnProperty(this.receiverNamespace))
			this.receiverRoute = remoteRoutingMap[this.receiverNamespace];
		
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$identifyChildren(remoteRoutingMap);
	}
};

ClientSocketUnit.prototype.remoteIdentify = function(target)
{
	if (this.parent)
		this.parent.remoteIdentify(target ? target : this);
};

ClientSocketUnit.prototype.register = function(deep)
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

ClientSocketUnit.prototype.registerChildren = function()
{
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$registerChildren(localRoutingMap);
};

ClientSocketUnit.prototype.$registerChildren = function(localRoutingMap)
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

ClientSocketUnit.prototype.unregister = function(deep)
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

ClientSocketUnit.prototype.unregisterChildren = function() {
	var localRoutingMap = this.getLocalRoutingMap();
	
	if (localRoutingMap)
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$unregisterChildren(localRoutingMap);
};

ClientSocketUnit.prototype.$unregisterChildren = function(localRoutingMap) {
	if (localRoutingMap)
	{
		if (this.namespace && localRoutingMap[this.namespace])
			delete localRoutingMap[this.namespace];
		
		for (var i = 0; i < this.units.length;i ++)
			this.units[i].$unregisterChildren(localRoutingMap);
	}
};

ClientSocketUnit.prototype.getLocalRoutingMap = function() {
	return this.parent ? this.parent.getLocalRoutingMap() : null;
};

ClientSocketUnit.prototype.getRemoteRoutingMap = function() {
	return this.parent ? this.parent.getRemoteRoutingMap() : null;
};

ClientSocketUnit.prototype.connected = function() {
	//sys.log("ClientSocketUnit[connected]: " + this.id);
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].connected();
};

ClientSocketUnit.prototype.disconnected = function() {
	//sys.log("ClientSocketUnit[disconnected]: " + this.id);
	for (var i = 0; i < this.units.length;i ++)
		this.units[i].disconnected();
};

ClientSocketUnit.prototype.online = function() {
	if (this.parent)
		return this.parent.online();
	
	return false;
};

ClientSocketUnit.generateId = function() {
	ClientSocketUnit.$id ++;
	return "SU." + ClientSocketUnit.$id + "." + Math.random().toString().substr(2);
};

ClientSocketUnit.$id = 0;