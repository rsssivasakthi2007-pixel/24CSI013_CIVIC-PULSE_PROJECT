require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const { User, Complaint } = require('./models');
const { classify } = require('./ai');
(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse');
  await Promise.all([User.deleteMany({}), Complaint.deleteMany({})]);
  await User.create({ name: 'Admin', email: 'admin@civicpulse.com', password: await bcrypt.hash('admin123', 10), role: 'admin' });
  const cit = await User.create({ name: 'Demo Citizen', email: 'citizen@civicpulse.com', password: await bcrypt.hash('citizen123', 10) });
  const samples = [
    ['Huge pothole near bus stand', 'Deep pothole causing accidents for two-wheelers', 11.0183, 76.9558],
    ['Garbage not collected', 'Trash dump overflowing for a week, bad smell', 11.0051, 76.9661],
    ['Streetlight not working', 'Street light broken, the lane is dark at night', 11.0247, 76.9372],
    ['Drain overflow on main road', 'Sewage overflow and waterlogging near school', 10.9925, 76.9614],
    ['Open manhole', 'Dangerous open manhole, urgent', 11.0112, 76.9733]
  ];
  for (const [i, [title, description, lat, lng]] of samples.entries()) {
    const ai = classify(title + ' ' + description);
    await Complaint.create({ title, description, category: ai.category, department: ai.department, priority: ai.priority,
      status: ['Pending', 'In Progress', 'Resolved', 'Pending', 'In Progress'][i], citizen: cit._id,
      location: { lat, lng, address: 'Coimbatore' }, history: [{ status: 'Pending', note: 'Complaint registered', by: cit.name }],
      resolvedAt: i === 2 ? new Date(Date.now() + 36e5 * 20) : undefined });
  }
  console.log('Seeded. Admin: admin@civicpulse.com / admin123'); process.exit(0);
})();
