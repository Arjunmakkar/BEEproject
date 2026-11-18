import mongoose from 'mongoose';

const GoalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    savedAmount: { type: Number, default: 0 },
    targetDate: { type: String, required: true },
    category: { type: String, default: 'General' },
    color: { type: String, default: '#10B981' },
    icon: { type: String, default: 'PiggyBank' },
    note: { type: String, default: '' },
    history: [
      {
        id: String,
        date: String,
        type: { type: String, enum: ['deposit', 'withdraw'] },
        amount: Number,
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export const Goal = mongoose.model('Goal', GoalSchema);

