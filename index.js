var sys = require('sys');

["plugin/StandardRadioPlugin"].forEach(function (path) {
  	var n = path.substr(path.lastIndexOf("/") + 1);
  	exports[n] = require('./lib/' + path);
});

exports.build = function(parent) {
	
	var plugin = new this.StandardRadioPlugin();
	plugin.on("destroy", function(){
		parent.removeUnit(plugin.id);
	});
	
	parent.addUnit(plugin);
	
	return plugin;
};