


const validName = (paramName) => {
  return (req, res, next) => {
    try {
      // Read the product name from the URL and use it as-is
      req[paramName] = req.params[paramName];
      return next();
    } catch (error) {
      return res.status(400).json({ error: `${paramName} is not a valid product name` });
    }
  };
};

export { validName };