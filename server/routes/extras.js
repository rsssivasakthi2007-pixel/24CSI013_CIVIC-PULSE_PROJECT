const { Complaint } = require('../models');
const { auth, adminOnly } = require('../middleware');
const { departments, categories } = require('../ai');
const admin = require('express').Router(), pub = require('express').Router();
const group = (arr, k) => arr.reduce((o, x) => (o[x[k] || 'Unassigned'] = (o[x[k] || 'Unassigned'] || 0) + 1, o), {});
async function stats() {
  const all = await Complaint.find();
  const done = all.filter(c => c.resolvedAt);
  const avg = done.length ? done.reduce((s, c) => s + (c.resolvedAt - c.createdAt), 0) / done.length / 36e5 : 0;
  const rated = all.filter(c => c.feedback && c.feedback.rating);
  return {
    total: all.length, byStatus: group(all, 'status'), byCategory: group(all, 'category'),
    byDepartment: group(all, 'department'), byPriority: group(all, 'priority'),
    avgResolutionHours: +avg.toFixed(1),
    avgRating: rated.length ? +(rated.reduce((s, c) => s + c.feedback.rating, 0) / rated.length).toFixed(1) : null
  };
}
admin.get('/stats', auth, adminOnly, async (req, res) => res.json({ ...(await stats()), departments, categories }));
pub.get('/stats', async (req, res) => res.json(await stats()));
pub.get('/complaints', async (req, res) => {
  const list = await Complaint.find().select('title category status priority location createdAt').sort('-createdAt').limit(500);
  res.json(list);
});
module.exports = { admin, pub };
