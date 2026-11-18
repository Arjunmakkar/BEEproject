import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    dueDay: { type: Number, required: true, min: 1, max: 31 },
    category: { type: String, default: 'General' },
    color: { type: String, default: '#6366F1' },
    icon: { type: String, default: 'CreditCard' },
    autoPay: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    paidMonths: [{ type: String }],
    reminderDays: { type: Number, default: 3 },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);

