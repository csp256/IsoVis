// Shared by the browser harness and tiny Bun fixture.
var IsoVisBenchStats = {
  summarize: function(values) {
    if (!values.length) return null;
    var sorted = values.slice().sort(function(a,b) {return a-b;});
    return {count:sorted.length,min:sorted[0],p50:sorted[Math.ceil(sorted.length*0.5)-1],
      p95:sorted[Math.ceil(sorted.length*0.95)-1],max:sorted[sorted.length-1]};
  }
};
