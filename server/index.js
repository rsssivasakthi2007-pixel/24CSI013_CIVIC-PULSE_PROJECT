require('dotenv').config();
const express = require('express'), mongoose = require('mongoose'), cors = require('cors');
const path = require('path'), fs = require('fs');
const { admin, pub } = require('./routes/extras');
const app = express();
app.use(cors()); app.use(express.json());
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin', admin);
app.use('/api/public', pub);
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse')
  .then(() => app.listen(PORT, () => console.log('CivicPulse API on ' + PORT)))
  .catch(e => { console.error('MongoDB connection failed', e.message); process.exit(1); });
