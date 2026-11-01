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

// Numeric URL input is untrusted. Fall back without leaving partial GUI state.
function getURLResolution(fallback) {
  requireResolution(fallback);
  try {
    var text = getURLParameter('resolution');
    if (text === null) return fallback;
    if (!/^\d+$/.test(text)) throw new Error('Invalid resolution URL parameter');
    return requireResolution(Number(text));
  } catch (error) {
    console.warn('Ignoring invalid resolution URL parameter:', error.message);
    return fallback;
  }
}
