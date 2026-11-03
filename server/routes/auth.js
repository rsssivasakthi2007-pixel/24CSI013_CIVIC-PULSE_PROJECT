const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sign, auth } = require('../middleware');
const out = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ message: 'Name, email and a 6+ char password are required' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'citizen' });
  res.json({ token: sign(u), user: out(u) });
});
router.post('/login', async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(400).json({ message: 'Invalid email or password' });
  res.json({ token: sign(u), user: out(u) });
});
router.get('/me', auth, async (req, res) => res.json(out(await User.findById(req.user.id))));
module.exports = router;
