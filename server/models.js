const mongoose = require('mongoose');
const { Schema } = mongoose;
const User = mongoose.model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['citizen', 'admin'], default: 'citizen' }
}, { timestamps: true }));
const complaintSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: String, department: String,
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'], default: 'Pending' },
  photo: String,
  location: { lat: Number, lng: Number, address: String },
  citizen: { type: Schema.Types.ObjectId, ref: 'User' },
  history: [{ status: String, note: String, by: String, at: { type: Date, default: Date.now } }],
  feedback: { rating: Number, comment: String },
  resolvedAt: Date
}, { timestamps: true });
complaintSchema.virtual('resolutionHours').get(function () {
  return this.resolvedAt ? +((this.resolvedAt - this.createdAt) / 36e5).toFixed(1) : null;
});
complaintSchema.set('toJSON', { virtuals: true });
const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = { User, Complaint };
