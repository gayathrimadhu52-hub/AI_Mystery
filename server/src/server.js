import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
import { CLIENT_URL, GEMINI_API_KEY, MONGODB_URI, PORT } from './config.js';

const requiredEnv = [
  ['MONGODB_URI', MONGODB_URI],
  ['GEMINI_API_KEY', GEMINI_API_KEY],
  ...(process.env.NODE_ENV === 'production' ? [['CLIENT_URL', CLIENT_URL]] : []),
];
const missingEnv = requiredEnv.filter(([, value]) => !value).map(([name]) => name);
if (missingEnv.length) throw new Error(`Missing required environment variable(s): ${missingEnv.join(', ')}`);

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
} catch (error) {
  console.error('Could not connect to MongoDB. Check MONGODB_URI, Atlas network access, and database credentials.');
  console.error(error.message);
  process.exit(1);
}
app.listen(PORT, () => console.log(`Mystery Room API listening on port ${PORT}`));
