const router = require('express').Router();
const multer = require('multer'), path = require('path'), fs = require('fs');
const { Complaint } = require('../models');
const { auth, adminOnly } = require('../middleware');
const { classify } = require('../ai');
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (r, f, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(f.originalname))
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (r, f, cb) => cb(null, /^image\//.test(f.mimetype))
});
const loc = b => ({ lat: parseFloat(b.lat), lng: parseFloat(b.lng), address: b.address || '' });

router.post('/classify', auth, (req, res) => res.json(classify(`${req.body.title || ''} ${req.body.description || ''}`)));

// CREATE
router.post('/', auth, upload.single('photo'), async (req, res) => {
  const b = req.body;
  if (!b.title || !b.description) return res.status(400).json({ message: 'Title and description required' });
  const ai = classify(`${b.title} ${b.description}`);
  const c = await Complaint.create({
    title: b.title, description: b.description,
    category: b.category && b.category !== 'Auto' ? b.category : ai.category,
    department: ai.department, priority: ai.priority,
    photo: req.file ? '/uploads/' + req.file.filename : undefined,
    location: loc(b), citizen: req.user.id,
    history: [{ status: 'Pending', note: 'Complaint registered', by: req.user.name }]
  });
  res.status(201).json(c);
});

// READ (list + search/filter). Citizens see only their own.
router.get('/', auth, async (req, res) => {
  const { q, status, category, priority, department } = req.query;
  const f = req.user.role === 'admin' ? {} : { citizen: req.user.id };
  if (status) f.status = status; if (category) f.category = category;
  if (priority) f.priority = priority; if (department) f.department = department;
  if (q) f.$or = [{ title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }, { 'location.address': new RegExp(q, 'i') }];
  res.json(await Complaint.find(f).populate('citizen', 'name email').sort('-createdAt'));
});
router.get('/:id', auth, async (req, res) => {
  const c = await Complaint.findById(req.params.id).populate('citizen', 'name email');
  if (!c) return res.status(404).json({ message: 'Not found' });
  if (req.user.role !== 'admin' && String(c.citizen._id) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json(c);
});

// UPDATE
router.put('/:id', auth, async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  const b = req.body;
  if (req.user.role === 'admin') {
    const changes = [];
    if (b.department && b.department !== c.department) { c.department = b.department; changes.push('Assigned to ' + b.department); }
    if (b.priority && b.priority !== c.priority) { c.priority = b.priority; changes.push('Priority set to ' + b.priority); }
    if (b.status && b.status !== c.status) {
      c.status = b.status; changes.push('Status changed to ' + b.status);
      c.resolvedAt = b.status === 'Resolved' ? new Date() : undefined;
    }
    if (b.note) changes.push(b.note);
    if (changes.length) c.history.push({ status: c.status, note: changes.join('; '), by: req.user.name });
  } else {
    if (String(c.citizen) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (c.status !== 'Pending') return res.status(400).json({ message: 'Only pending complaints can be edited' });
    ['title', 'description', 'category'].forEach(k => { if (b[k]) c[k] = b[k]; });
    c.history.push({ status: c.status, note: 'Complaint edited by citizen', by: req.user.name });
  }
  await c.save(); res.json(c);
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  const own = String(c.citizen) === req.user.id;
  if (req.user.role !== 'admin' && !(own && c.status === 'Pending')) return res.status(403).json({ message: 'Not allowed' });
  if (c.photo) fs.unlink(path.join(__dirname, '..', c.photo), () => {});
  await c.deleteOne(); res.json({ message: 'Deleted' });
});

// FEEDBACK
router.post('/:id/feedback', auth, async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c || String(c.citizen) !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  if (c.status !== 'Resolved') return res.status(400).json({ message: 'Feedback allowed after resolution' });
  c.feedback = { rating: Math.min(5, Math.max(1, +req.body.rating || 5)), comment: req.body.comment || '' };
  c.history.push({ status: c.status, note: 'Citizen feedback submitted', by: req.user.name });
  await c.save(); res.json(c);
});
module.exports = router;
