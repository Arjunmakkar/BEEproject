import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['expense', 'income'], default: 'expense' },
    icon: { type: String, default: 'Tag' },
    color: { type: String, default: '#6366f1' },
    budgetLimit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', CategorySchema);

