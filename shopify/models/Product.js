const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: 0 },
  category: { type: String, required: true },
  subcategory: { type: String, default: '' },
  brand: { type: String, default: '' },
  image: { type: String, required: true },
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  tags: [String]
}, { timestamps: true });
productSchema.index({ name: 'text', description: 'text', category: 'text', brand: 'text' });
module.exports = mongoose.model('Product', productSchema);
