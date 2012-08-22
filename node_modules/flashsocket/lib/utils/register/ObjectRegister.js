var sys = require('sys');

ObjectRegister = module.exports = function(name, parent)
{
	this.collection = new Array();
	this.name = name;
	this.obj = null;
	this.total = 0;
	this.parent = parent;
};

ObjectRegister.prototype.read = function(route)
{
	if (!route || route.length == 0)
		throw new Error("Invalid route parameter!");
	
	var cursor = this;
	
	for (var i = 0;i < route.length;i ++)
		if (cursor.collection[route[i]])
			cursor = cursor.collection[route[i]];
		else
			return null;
	
	return cursor.obj;
};

ObjectRegister.prototype.exist = function(route)
{
	if (!route || route.length == 0)
		throw new Error("Invalid route parameter!");
	
	var cursor = this;
	var i;
	
	for (i = 0;i < route.length;i ++)
		if (cursor.collection[route[i]])
			cursor = cursor.collection[route[i]];
		else
			return false;
	
	return true;
};

ObjectRegister.prototype.buildMap = function(route, excludePath, distinct)
{
	var map = new Array();
	
	if (!excludePath)
		excludePath = 0;
	
	this.readMap(map, [], route, excludePath, distinct);
	
	if (map.length == 0)
		return null;
	
	return map;
};

ObjectRegister.prototype.readMap = function(map, route1, route2, excludePath, distinct)
{
	var cursor = this;
	
	route1 = [].concat(route1);
	route2 = [].concat(route2);
	
	while (route2.length > 0 && route2[0] != "*")
	{
		var n = route2.shift();
		route1.push(n);
		
		if (cursor.collection[n])
			cursor = cursor.collection[n];
		else
			return ;
	}
	
	if (cursor.obj && route1.length >= excludePath)
	{
		var r = [].concat(route1);
		
		if (excludePath > 0)
			r.splice(0, excludePath);
		
		if (!distinct)
			map.push(r);
		else
		if (!cursor.routeExist(map, r))
			map.push(r);
	}
	
	if (cursor.total > 0 && (route2.length == 0 || route2[0] == "*"))
	{
		if (route2[0] == "*")
			route2.shift();
		
		for (var s in cursor.collection)
		{
			var p = route1.concat([s]);
			cursor.collection[s].readMap(map, p, route2, excludePath, distinct);
		}
	}
};

ObjectRegister.prototype.routeExist = function(routes, route)
{
	if (routes.length == 0)
		return false;
	
	var exist;
	
	for (var i = 0;i < routes.length;i ++)
		if (routes[i].length == route.length)
		{
			exist = true;
			
			for (var k = 0;k < routes[i].length;k ++)
				if (routes[i][k] != route[k])
				{
					exist = false;
					break;
				}
			
			if (exist)
				return true;
		}
	
	return false;
};

ObjectRegister.prototype.buildObjectsMap = function(route, excludePath)
{
	var map = new Array();
	var cursor = this;
	
	route = route ? route : [];
	
	if (route.length > 0)
	{
		for (var i = 0;i < route.length;i ++)
			if (cursor.collection[route[i]])
				cursor = cursor.collection[route[i]];
			else
				return null;
	}
	
	if (excludePath && excludePath.length > 0)
		for (var i = 0;i < excludePath.length;i ++) 
			if (route[0] == excludePath[0])
			{
				route.shift();
				excludePath.shift();
			}
			else
				break;
	
	if (cursor.obj && route.length > 0)
		map.push(route);
	
	if (cursor.total > 0)
		cursor.readObjectsMap(cursor, map, route);
	
	if (map.length == 0)
		return null;
	
	return map;
};

ObjectRegister.prototype.readObjectsMap = function(cursor, map, route)
{
	if (cursor.total > 0)
		for (var s in cursor.collection)
		{
			var p = route.concat([s]);
			
			if (cursor.collection[s].obj)
				map.push({
					route: p,
					obj: cursor.collection[s].obj
				});
			
			if (cursor.collection[s].total > 0)
				cursor.collection[s].readObjectsMap(cursor.collection[s], map, p);
		}
};

ObjectRegister.prototype.register = function(route, obj)
{
	if (!route || !obj)
		throw new Error("Invalid route parameter!");
	
	var cursor = this;
	
	for (var i = 0;i < route.length;i ++)
	{
		if (!cursor.collection[route[i]])
		{
			cursor.collection[route[i]] = new ObjectRegister(route[i], cursor);
			cursor.total ++;
		}
		
		parent = cursor;
		cursor = cursor.collection[route[i]];
	}
	
	cursor.obj = obj;
};

ObjectRegister.prototype.unregister = function(route)
{
	if (!route)
		throw new Error("Invalid route parameter!");
	
	var cursor = this;
	
	for (var i = 0;i < route.length;i ++)
		if (cursor.collection[route[i]])
			cursor = cursor.collection[route[i]];
		else
			return false;
	
	cursor.obj = null;
	
	var executed = false;
	var name;
	
	while (cursor.parent)
	{
		if (cursor.total == 0 && cursor.obj == null)
		{
			name = cursor.name;
			executed = true;
			
			cursor = cursor.parent;
			cursor.total --;
			
			delete(cursor.collection[name]);
		}
		else
			break;
	}
	
	return executed;
};

ObjectRegister.prototype.remove = function(route)
{
	if (!route)
		throw new Error("Invalid route parameter!");
	
	var cursor = this;
	
	for (var i = 0;i < route.length;i ++)
		if (cursor.collection[route[i]])
			cursor = cursor.collection[route[i]];
		else
			return false;
	
	var executed = false;
	var name;
	
	if (cursor.parent)
	{
		name = cursor.name;
		executed = true;
		
		cursor = cursor.parent;
		cursor.total --;
		
		delete(cursor.collection[name]);
		
		while (cursor.parent)
		{
			if (cursor.total == 0 && cursor.obj == null)
			{
				name = cursor.name;
				
				cursor = cursor.parent;
				cursor.total --;
				
				delete(cursor.collection[name]);
			}
			else
				break;
		}
	}
	
	return executed;
};

ObjectRegister.prototype.removeByPattern = function(pattern)
{
	if (!pattern || pattern.length < 2 || pattern[0] != "*")
		throw new Error("Invalid pattern parameter!");
	
	var cursor = this;
	var allPart = true;
	
	for (var i = 0;i < pattern.length;i ++)
	{
		if (allPart && pattern[i] != "*")
			allPart = false;
		else
		if (!allPart && pattern[i] == "*")
			return false;
	}
	
	this.executeRemoveByPattern(pattern);
	
	return true;
};

ObjectRegister.prototype.executeRemoveByPattern = function(pattern)
{
	if (pattern.length > 0)
	{
		if (pattern[0] == "*")
		{
			if (this.total > 0)
			{
				var p = [].concat(pattern);
				p.shift();
				
				for (var s in this.collection)
					this.collection[s].executeRemoveByPattern(p);
			}
		}
		else
			this.remove(pattern);
	}
};

ObjectRegister.prototype.clear = function()
{
	this.collection = new Array(); 
	this.total = 0;
	this.obj = null;
};