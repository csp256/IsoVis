function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

function getURLParameterWithDefault(name, def) {
	var val = getURLParameter(name);
	if (val == null)
		return def;
	else
		return val;
}
