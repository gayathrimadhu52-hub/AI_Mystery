import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
import { MONGODB_URI, PORT } from './config.js';

if (!MONGODB_URI) throw new Error('MONGODB_URI is required.');
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
} catch (error) {
  console.error('Could not connect to MongoDB. Check MONGODB_URI, Atlas network access, and database credentials.');
  console.error(error.message);
  process.exit(1);
}
app.listen(PORT, () => console.log(`Mystery Room API listening on port ${PORT}`));
