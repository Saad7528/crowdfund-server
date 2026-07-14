const jwt = require('jsonwebtoken');

// verifyToken is the main JWT authorization guard. It decodes the bearer token 
// from the Authorization header and verifies it against the server secret key.
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access: Token missing' });
  }
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123', (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access: Token invalid' });
    }
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  const role = req.decoded?.role;
  if (role !== 'Admin') {
    return res.status(403).send({ message: 'Forbidden access: Admin role required' });
  }
  next();
};

const verifyCreator = (req, res, next) => {
  const role = req.decoded?.role;
  if (role !== 'Creator' && role !== 'Admin') {
    return res.status(403).send({ message: 'Forbidden access: Creator role required' });
  }
  next();
};

const verifySupporter = (req, res, next) => {
  const role = req.decoded?.role;
  if (role !== 'Supporter' && role !== 'Admin') {
    return res.status(403).send({ message: 'Forbidden access: Supporter role required' });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyCreator,
  verifySupporter
};
