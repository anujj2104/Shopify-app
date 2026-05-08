const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/wishlist/toggle
exports.toggleWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const user = await User.findById(req.user._id);
    const idx = user.wishlist.indexOf(productId);
    let added;
    if (idx > -1) { user.wishlist.splice(idx, 1); added = false; }
    else { user.wishlist.push(productId); added = true; }
    await user.save();
    res.json({ success: true, added, message: added ? 'Added to wishlist' : 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
