const jwt = require('jsonwebtoken');
const secret = () => process.env.JWT_SECRET || 'dev_secret';
exports.sign = u => jwt.sign({ id: u._id, role: u.role, name: u.name }, secret(), { expiresIn: '7d' });
exports.auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  try { req.user = jwt.verify(h.replace('Bearer ', ''), secret()); next(); }
  catch { res.status(401).json({ message: 'Please log in' }); }
};
exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access only' });
