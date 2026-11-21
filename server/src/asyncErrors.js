import Layer from "express/lib/router/layer.js";
// Make rejected promises in async handlers reach Express error middleware.
const orig = Layer.prototype.handle_request;
Layer.prototype.handle_request = function (req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next();
  try {
    const r = fn(req, res, next);
    if (r && typeof r.catch === "function") r.catch(next);
  } catch (e) { next(e); }
};
