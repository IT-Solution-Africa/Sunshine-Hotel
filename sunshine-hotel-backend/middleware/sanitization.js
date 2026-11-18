// middleware/sanitization.js
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      } else if (typeof obj[key] === 'string') {
        if (key.startsWith('$')) {
          delete obj[key];
        }
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};