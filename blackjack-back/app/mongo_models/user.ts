import mongoose from 'mongoose';
import hash from '@adonisjs/core/services/hash';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: false },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await hash.use('scrypt').make(this.password);
  next();
});

// Method to verify password
userSchema.methods.verifyPassword = async function(plainPassword: string) {
  return await hash.use('scrypt').verify(this.password, plainPassword);
};

export const User = mongoose.model('User', userSchema);
