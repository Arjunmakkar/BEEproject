import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    amount: { type: Number, required: true },
    categoryId: { type: String, required: true },
    categoryName: { type: String, required: true },
    date: { type: String, required: true },
    paymentMode: { type: String, default: 'UPI' },
    note: { type: String, default: '' },
    isRecurring: { type: Boolean, default: false },
    recurrence: { type: String, default: 'none' },
  },
  { timestamps: true }
);

// Compound Index for high-speed chronological and category queries
TransactionSchema.index({ date: -1, type: 1, categoryId: 1 });

export const Transaction = mongoose.model('Transaction', TransactionSchema);

