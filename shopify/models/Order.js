const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, image: String, price: Number, quantity: Number }],
  shippingAddress: { fullName: String, phone: String, address: String, city: String, state: String, pincode: String, country: { type: String, default: 'India' } },
  paymentMethod: { type: String, default: 'razorpay' },
  paymentResult: { id: String, status: String },
  itemsPrice: { type: Number, default: 0 },
  shippingPrice: { type: Number, default: 0 },
  taxPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: false },
  paidAt: Date,
  status: { type: String, enum: ['pending','processing','shipped','delivered','cancelled'], default: 'pending' },
  razorpayOrderId: String,
  razorpayPaymentId: String
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);
