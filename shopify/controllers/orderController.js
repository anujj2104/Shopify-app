const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

// POST /api/orders/create
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'razorpay' } = req.body;
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });
    const itemsPrice = cart.totalPrice;
    const shippingPrice = itemsPrice > 999 ? 0 : 99;
    const taxPrice = Math.round(itemsPrice * 0.05);
    const totalPrice = itemsPrice + shippingPrice + taxPrice;
    const orderItems = cart.items.map(i => ({ product: i.product._id, name: i.product.name, image: i.product.image, price: i.price, quantity: i.quantity }));
    const rzpOrder = await razorpay.orders.create({ amount: totalPrice * 100, currency: 'INR', receipt: 'rcpt_' + Date.now() });
    const order = await Order.create({ user: req.user._id, items: orderItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, taxPrice, totalPrice, razorpayOrderId: rzpOrder.id });
    res.json({ success: true, order, razorpayOrder: rzpOrder, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/orders/verify
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    const isValid = expected === razorpay_signature;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.isPaid = isValid;
    order.paidAt = isValid ? new Date() : undefined;
    order.status = isValid ? 'processing' : 'cancelled';
    order.razorpayPaymentId = razorpay_payment_id;
    order.paymentResult = { id: razorpay_payment_id, status: isValid ? 'paid' : 'failed' };
    await order.save();
    if (isValid) await Cart.findOneAndUpdate({ user: req.user._id }, { items: [], totalPrice: 0 });
    res.json({ success: isValid, order, message: isValid ? 'Payment verified' : 'Payment failed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
