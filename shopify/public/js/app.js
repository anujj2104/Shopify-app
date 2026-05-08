/* ============================================
   ShopWave — Complete Frontend JavaScript
   Handles: Auth, Products, Cart, Wishlist,
   Checkout, Orders, Admin, Modals, Search
   ============================================ */

// ── State ──────────────────────────────────────
const STATE = {
  user: null,
  token: null,
  cart: { items: [], totalPrice: 0 },
  wishlist: [],
  products: [],
  currentPage: 1,
  currentCategory: 'all',
  currentSort: 'default',
  currentSearch: '',
  minPrice: '',
  maxPrice: '',
  totalProducts: 0,
  LIMIT: 20,
  debounceTimer: null,
  modalProductId: null,
  modalQty: 1,
};

const API = '/api';

// ── Boot ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderAuth();
  navigate('home');
  hideLoader();

  // Search on Enter key
  document.getElementById('navSearch').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.getElementById('mobileSearch').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Close user dropdown on outside click
  document.addEventListener('click', e => {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(e.target)) {
      userMenu.classList.remove('open');
    }
  });
});

function hideLoader() {
  setTimeout(() => {
    document.getElementById('globalLoader').classList.add('hidden');
  }, 600);
}

function showPageLoader() {
  document.getElementById('globalLoader').classList.remove('hidden');
}

function hidePageLoader() {
  document.getElementById('globalLoader').classList.add('hidden');
}

// ── Storage ────────────────────────────────────
function loadFromStorage() {
  try {
    STATE.token = localStorage.getItem('sw_token');
    const user = localStorage.getItem('sw_user');
    if (user) STATE.user = JSON.parse(user);
  } catch (e) {}
}

function saveToStorage() {
  if (STATE.token) localStorage.setItem('sw_token', STATE.token);
  else localStorage.removeItem('sw_token');
  if (STATE.user) localStorage.setItem('sw_user', JSON.stringify(STATE.user));
  else localStorage.removeItem('sw_user');
}

// ── Toast Notifications ─────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, duration);
}

// ── Navigation ──────────────────────────────────
function navigate(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const el = document.getElementById(`page-${page}`);
  if (!el) return;
  el.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific loaders
  const protectedPages = ['cart', 'wishlist', 'checkout', 'orders', 'profile', 'admin'];
  if (protectedPages.includes(page) && !STATE.user) {
    showToast('Please login to continue', 'info');
    navigate('login');
    return;
  }

  switch(page) {
    case 'home': loadProducts(); break;
    case 'cart': loadCart(); break;
    case 'wishlist': loadWishlist(); break;
    case 'checkout': loadCheckout(); break;
    case 'orders': loadOrders(); break;
    case 'profile': loadProfile(); break;
    case 'admin':
      if (!STATE.user?.isAdmin) { showToast('Admin access required', 'error'); navigate('home'); return; }
      loadAdminProducts();
      break;
  }
}

// ── Auth UI ─────────────────────────────────────
function renderAuth() {
  const authSection = document.getElementById('authSection');
  const userSection = document.getElementById('userSection');
  const wishlistBtn = document.getElementById('wishlistNavBtn');

  if (STATE.user) {
    authSection.style.display = 'none';
    userSection.style.display = 'flex';
    document.getElementById('userName').textContent = STATE.user.name.split(' ')[0];
    document.getElementById('userAvatar').textContent = STATE.user.name[0].toUpperCase();
    document.getElementById('adminPanelLink').style.display = STATE.user.isAdmin ? 'flex' : 'none';
    if (STATE.user.isAdmin) document.getElementById('adminPanelLink').style.display = 'flex';
    // Load cart count
    loadCartCount();
    loadWishlistCount();
  } else {
    authSection.style.display = 'flex';
    userSection.style.display = 'none';
    document.getElementById('cartBadge').textContent = '0';
    document.getElementById('wishlistBadge').style.display = 'none';
  }
}

function toggleUserMenu() {
  document.querySelector('.user-menu').classList.toggle('open');
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

// ── API Helper ───────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API}${endpoint}`, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: 'Network error' } };
  }
}

// ── AUTH HANDLERS ────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showToast('Please fill all fields', 'error');
  btn.disabled = true; btn.textContent = 'Signing in...';
  const { ok, data } = await apiCall('/auth/login', 'POST', { email, password });
  btn.disabled = false; btn.textContent = 'Sign In';
  if (ok && data.success) {
    STATE.token = data.token;
    STATE.user = data.user;
    saveToStorage();
    renderAuth();
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
    navigate('home');
  } else {
    showToast(data.message || 'Login failed', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('regBtn');
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  if (!name || !email || !password) return showToast('Please fill all fields', 'error');
  if (password !== confirm) return showToast('Passwords do not match', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
  btn.disabled = true; btn.textContent = 'Creating account...';
  const { ok, data } = await apiCall('/auth/register', 'POST', { name, email, password });
  btn.disabled = false; btn.textContent = 'Create Account';
  if (ok && data.success) {
    STATE.token = data.token;
    STATE.user = data.user;
    saveToStorage();
    renderAuth();
    showToast(`Welcome to ShopWave, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
    navigate('home');
  } else {
    showToast(data.message || 'Registration failed', 'error');
  }
}

async function logoutUser() {
  await apiCall('/auth/logout', 'POST');
  STATE.token = null; STATE.user = null; STATE.cart = { items: [], totalPrice: 0 }; STATE.wishlist = [];
  saveToStorage();
  renderAuth();
  showToast('Logged out successfully', 'info');
  navigate('home');
}

function togglePass(id) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ── PRODUCTS ─────────────────────────────────────
async function loadProducts(reset = false) {
  if (reset) { STATE.currentPage = 1; STATE.products = []; }
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('productsEmpty');
  const countEl = document.getElementById('productsCount');
  const titleEl = document.getElementById('productsTitle');

  // Build query
  const params = new URLSearchParams();
  if (STATE.currentCategory !== 'all') params.set('category', STATE.currentCategory);
  if (STATE.currentSearch) params.set('search', STATE.currentSearch);
  if (STATE.currentSort !== 'default') params.set('sort', STATE.currentSort);
  if (STATE.minPrice) params.set('minPrice', STATE.minPrice);
  if (STATE.maxPrice) params.set('maxPrice', STATE.maxPrice);
  const ratingFilter = document.querySelector('input[name=rating]:checked')?.value;
  params.set('page', STATE.currentPage);
  params.set('limit', STATE.LIMIT);

  // Skeleton loading on first load
  if (STATE.currentPage === 1) {
    grid.innerHTML = Array(8).fill(0).map(() => `
      <div class="product-card">
        <div class="skeleton" style="aspect-ratio:1/0.88"></div>
        <div style="padding:14px">
          <div class="skeleton" style="height:12px;width:60%;margin-bottom:8px"></div>
          <div class="skeleton" style="height:16px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:12px;width:40%;margin-bottom:10px"></div>
          <div class="skeleton" style="height:36px;margin-top:8px"></div>
        </div>
      </div>`).join('');
  }

  const { ok, data } = await apiCall(`/products?${params}`);

  if (!ok || !data.success) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  STATE.totalProducts = data.total;
  if (STATE.currentPage === 1) STATE.products = data.products;
  else STATE.products = [...STATE.products, ...data.products];

  const cat = STATE.currentCategory !== 'all' ? STATE.currentCategory : 'All';
  titleEl.textContent = STATE.currentSearch ? `Results for "${STATE.currentSearch}"` : `${cat} Products`;
  countEl.textContent = `${STATE.totalProducts} products`;

  if (!STATE.products.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    // Filter by rating client-side
    let filtered = ratingFilter ? STATE.products.filter(p => p.rating >= parseFloat(ratingFilter)) : STATE.products;
    grid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
    renderPagination(data.pages);
  }

  // Load more button
  const lmw = document.getElementById('loadMoreWrap');
  lmw.style.display = data.page < data.pages ? 'block' : 'none';
}

function renderProductCard(p) {
  const disc = p.originalPrice > p.price ? Math.round((1 - p.price/p.originalPrice)*100) : 0;
  const badgeClass = p.badge ? `badge-${p.badge.toLowerCase()}` : '';
  const inWishlist = STATE.wishlist.includes(p._id);
  const starsHtml = renderStars(p.rating);
  return `
    <div class="product-card" onclick="openProductModal('${p._id}')">
      <div class="product-img-wrap">
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x280?text=Image'">
        <div class="product-overlay">
          <button class="overlay-btn" onclick="event.stopPropagation();quickAddCart('${p._id}')">Add to Cart</button>
        </div>
        ${p.badge ? `<span class="product-badge ${badgeClass}">${p.badge}</span>` : ''}
        ${disc ? `<span class="product-badge badge-sale" style="left:auto;right:10px">-${disc}%</span>` : ''}
        <button class="wishlist-btn ${inWishlist?'active':''}" onclick="event.stopPropagation();toggleWishlist('${p._id}',this)" title="${inWishlist?'Remove from':'Add to'} wishlist">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="product-info">
        <div class="product-brand">${p.brand || p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-rating">
          <span class="stars">${starsHtml}</span>
          <span class="rating-count">${p.rating.toFixed(1)} (${p.numReviews.toLocaleString()})</span>
        </div>
        <div class="product-price">
          <span class="price-current">₹${p.price.toLocaleString('en-IN')}</span>
          ${p.originalPrice > p.price ? `<span class="price-original">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          ${disc ? `<span class="price-discount">${disc}% off</span>` : ''}
        </div>
        <button class="btn-add-cart" onclick="event.stopPropagation();quickAddCart('${p._id}')">
          🛒 Add to Cart
        </button>
      </div>
    </div>`;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

function filterCategory(cat, btn) {
  STATE.currentCategory = cat;
  STATE.currentPage = 1;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  navigate('home');
  loadProducts(true);
  scrollToProducts();
}

function sortProducts(val) {
  STATE.currentSort = val;
  loadProducts(true);
}

function doSearch() {
  const q = (document.getElementById('navSearch').value || document.getElementById('mobileSearch').value).trim();
  STATE.currentSearch = q;
  STATE.currentPage = 1;
  STATE.currentCategory = 'all';
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.cat-chip')?.classList.add('active');
  navigate('home');
  loadProducts(true);
  scrollToProducts();
}

function debounceFilter() {
  clearTimeout(STATE.debounceTimer);
  STATE.debounceTimer = setTimeout(() => {
    STATE.minPrice = document.getElementById('minPrice')?.value || '';
    STATE.maxPrice = document.getElementById('maxPrice')?.value || '';
    loadProducts(true);
  }, 500);
}

function clearFilters() {
  STATE.currentSearch = '';
  STATE.currentCategory = 'all';
  STATE.currentSort = 'default';
  STATE.minPrice = '';
  STATE.maxPrice = '';
  STATE.currentPage = 1;
  document.getElementById('navSearch').value = '';
  document.getElementById('mobileSearch').value = '';
  if (document.getElementById('minPrice')) document.getElementById('minPrice').value = '';
  if (document.getElementById('maxPrice')) document.getElementById('maxPrice').value = '';
  document.querySelectorAll('input[name=rating]')[0].checked = true;
  document.querySelector('.cat-chip')?.classList.add('active');
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.cat-chip')?.classList.add('active');
  loadProducts(true);
}

function renderPagination(totalPages) {
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === STATE.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function goToPage(n) {
  STATE.currentPage = n;
  loadProducts();
  scrollToProducts();
}

function loadMore() {
  STATE.currentPage++;
  loadProducts();
}

function scrollToProducts() {
  document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── PRODUCT MODAL ─────────────────────────────────
async function openProductModal(id) {
  STATE.modalProductId = id;
  STATE.modalQty = 1;
  const backdrop = document.getElementById('productModal');
  document.getElementById('modalContent').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:300px"><div class="loader-spinner"></div></div>`;
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';

  const { ok, data } = await apiCall(`/products/${id}`);
  if (!ok || !data.success) {
    document.getElementById('modalContent').innerHTML = `<div style="padding:40px;text-align:center"><p>Failed to load product</p></div>`;
    return;
  }
  const p = data.product;
  const disc = p.originalPrice > p.price ? Math.round((1 - p.price/p.originalPrice)*100) : 0;
  const inWishlist = STATE.wishlist.includes(p._id);
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-img">
      <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x380?text=Image'">
    </div>
    <div class="modal-info">
      <div class="modal-brand">${p.brand || p.category}</div>
      <h2 class="modal-name">${p.name}</h2>
      <div class="modal-rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span style="font-size:13px;color:var(--text-muted)">${p.rating.toFixed(1)} · ${p.numReviews.toLocaleString()} reviews</span>
      </div>
      <div class="modal-price">
        <span class="modal-price-current">₹${p.price.toLocaleString('en-IN')}</span>
        ${p.originalPrice > p.price ? `<span class="modal-price-original">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        ${disc ? `<span class="modal-save">Save ${disc}%</span>` : ''}
      </div>
      <p class="modal-desc">${p.description}</p>
      <div class="modal-meta">
        <div class="modal-meta-row"><span class="modal-meta-label">Stock:</span><span class="${p.stock > 0 ? 'in-stock' : 'out-stock'}">${p.stock > 0 ? `✅ In Stock (${p.stock} left)` : '❌ Out of Stock'}</span></div>
        <div class="modal-meta-row"><span class="modal-meta-label">Category:</span><span>${p.category}</span></div>
        ${p.brand ? `<div class="modal-meta-row"><span class="modal-meta-label">Brand:</span><span>${p.brand}</span></div>` : ''}
      </div>
      <div class="modal-actions">
        <div class="qty-selector">
          <div class="qty-selector-ctrl">
            <button onclick="changeModalQty(-1)">−</button>
            <span id="modalQtyVal">1</span>
            <button onclick="changeModalQty(1)">+</button>
          </div>
          <button class="btn-primary" style="flex:1" onclick="addFromModal('${p._id}')" ${p.stock === 0 ? 'disabled' : ''}>
            ${p.stock === 0 ? '❌ Out of Stock' : '🛒 Add to Cart'}
          </button>
        </div>
        <button class="btn-outline" onclick="toggleWishlistModal('${p._id}',this)">
          ${inWishlist ? '❤️ Remove from Wishlist' : '🤍 Add to Wishlist'}
        </button>
        ${p.stock > 0 ? `<button class="btn-primary" style="background:var(--success)" onclick="buyNowModal('${p._id}')">⚡ Buy Now</button>` : ''}
      </div>
      <div class="modal-perks">
        <div class="modal-perk">🚀 Free delivery</div>
        <div class="modal-perk">↩️ 30-day return</div>
        <div class="modal-perk">🔒 Secure pay</div>
        <div class="modal-perk">✅ Genuine product</div>
      </div>
    </div>`;
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if (e.target === document.getElementById('productModal')) closeProductModal();
}

function changeModalQty(d) {
  STATE.modalQty = Math.max(1, STATE.modalQty + d);
  document.getElementById('modalQtyVal').textContent = STATE.modalQty;
}

async function addFromModal(id) {
  await addToCart(id, STATE.modalQty);
  closeProductModal();
}

async function buyNowModal(id) {
  await addToCart(id, STATE.modalQty);
  closeProductModal();
  navigate('checkout');
}

// ── CART ──────────────────────────────────────────
async function loadCartCount() {
  if (!STATE.user) return;
  const { ok, data } = await apiCall('/cart');
  if (ok && data.success) {
    STATE.cart = data.cart;
    const count = STATE.cart.items.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cartBadge').textContent = count;
  }
}

async function loadCart() {
  const layout = document.getElementById('cartLayout');
  const countEl = document.getElementById('cartItemCount');
  layout.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="loader-spinner" style="margin:0 auto"></div></div>`;

  const { ok, data } = await apiCall('/cart');
  if (!ok || !data.success) { showToast('Failed to load cart', 'error'); return; }
  STATE.cart = data.cart;

  const total = STATE.cart.items.reduce((s, i) => s + i.quantity, 0);
  countEl.textContent = `${total} item${total !== 1 ? 's' : ''}`;

  if (!STATE.cart.items.length) {
    layout.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Add some products to get started!</p>
      <button class="btn-primary" onclick="navigate('home')">Start Shopping</button>
    </div>`;
    return;
  }

  const shipping = STATE.cart.totalPrice >= 999 ? 0 : 99;
  const tax = Math.round(STATE.cart.totalPrice * 0.05);
  const grandTotal = STATE.cart.totalPrice + shipping + tax;

  layout.innerHTML = `
    <div class="cart-items-list">
      <div class="cart-item-header"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span><span></span></div>
      ${STATE.cart.items.map(item => {
        const p = item.product;
        if (!p) return '';
        return `<div class="cart-item">
          <div class="cart-item-product">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/72?text=?'">
            <div>
              <h4>${p.name}</h4>
              <span>${p.category}</span>
            </div>
          </div>
          <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="cart-qty-wrap">
            <button class="qty-btn" onclick="updateQty('${p._id}',-1)">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQty('${p._id}',1)">+</button>
          </div>
          <div class="cart-subtotal">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
          <button class="btn-icon" onclick="removeCartItem('${p._id}')" title="Remove">🗑️</button>
        </div>`;
      }).join('')}
    </div>
    <div>
      <div class="cart-summary-box">
        <h2>Order Summary</h2>
        <div class="summary-row"><span>Subtotal (${total} items)</span><span>₹${STATE.cart.totalPrice.toLocaleString('en-IN')}</span></div>
        <div class="summary-row"><span>Shipping</span><span class="${shipping === 0 ? 'free-text' : ''}">${shipping === 0 ? 'FREE' : '₹' + shipping}</span></div>
        <div class="summary-row"><span>Tax (5%)</span><span>₹${tax.toLocaleString('en-IN')}</span></div>
        <div class="summary-row summary-total"><span>Total</span><span>₹${grandTotal.toLocaleString('en-IN')}</span></div>
        <button class="btn-primary btn-block" onclick="navigate('checkout')">Proceed to Checkout →</button>
        <button class="btn-outline btn-block" style="margin-top:10px" onclick="navigate('home')">← Continue Shopping</button>
      </div>
    </div>`;
}

async function quickAddCart(productId) {
  await addToCart(productId, 1);
}

async function addToCart(productId, qty = 1) {
  if (!STATE.user) {
    showToast('Please login to add items to cart', 'info');
    navigate('login');
    return;
  }
  const { ok, data } = await apiCall('/cart/add', 'POST', { productId, quantity: qty });
  if (ok && data.success) {
    STATE.cart = data.cart;
    const count = STATE.cart.items.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cartBadge').textContent = count;
    showToast(data.message || 'Added to cart', 'success');
  } else {
    showToast(data.message || 'Could not add to cart', 'error');
  }
}

async function updateQty(productId, delta) {
  const item = STATE.cart.items.find(i => i.product?._id === productId || i.product === productId);
  if (!item) return;
  const newQty = item.quantity + delta;
  const { ok, data } = await apiCall('/cart/update', 'PUT', { productId, quantity: newQty });
  if (ok && data.success) { STATE.cart = data.cart; loadCart(); updateCartBadge(); }
  else showToast(data.message || 'Failed to update', 'error');
}

async function removeCartItem(productId) {
  const { ok, data } = await apiCall(`/cart/${productId}`, 'DELETE');
  if (ok && data.success) { STATE.cart = data.cart; loadCart(); updateCartBadge(); showToast('Item removed', 'info'); }
  else showToast('Failed to remove', 'error');
}

function updateCartBadge() {
  const count = STATE.cart.items.reduce((s, i) => s + i.quantity, 0);
  document.getElementById('cartBadge').textContent = count;
}

// ── WISHLIST ──────────────────────────────────────
async function loadWishlistCount() {
  if (!STATE.user) return;
  const { ok, data } = await apiCall('/wishlist');
  if (ok && data.success) {
    STATE.wishlist = data.wishlist.map(p => p._id || p);
    const badge = document.getElementById('wishlistBadge');
    badge.textContent = STATE.wishlist.length;
    badge.style.display = STATE.wishlist.length ? 'flex' : 'none';
  }
}

async function loadWishlist() {
  const grid = document.getElementById('wishlistGrid');
  const empty = document.getElementById('wishlistEmpty');
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="loader-spinner" style="margin:0 auto"></div></div>`;

  const { ok, data } = await apiCall('/wishlist');
  if (!ok || !data.success) { showToast('Failed to load wishlist', 'error'); return; }
  STATE.wishlist = data.wishlist.map(p => p._id);

  if (!data.wishlist.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = data.wishlist.map(p => renderProductCard(p)).join('');
}

async function toggleWishlist(productId, btn) {
  if (!STATE.user) { showToast('Please login to use wishlist', 'info'); navigate('login'); return; }
  const { ok, data } = await apiCall('/wishlist/toggle', 'POST', { productId });
  if (ok && data.success) {
    if (data.added) {
      STATE.wishlist.push(productId);
      if (btn) btn.innerHTML = '❤️';
    } else {
      STATE.wishlist = STATE.wishlist.filter(id => id !== productId);
      if (btn) btn.innerHTML = '🤍';
    }
    const badge = document.getElementById('wishlistBadge');
    badge.textContent = STATE.wishlist.length;
    badge.style.display = STATE.wishlist.length ? 'flex' : 'none';
    showToast(data.message, data.added ? 'success' : 'info');
  }
}

async function toggleWishlistModal(productId, btn) {
  await toggleWishlist(productId, null);
  const inWishlist = STATE.wishlist.includes(productId);
  if (btn) btn.textContent = inWishlist ? '❤️ Remove from Wishlist' : '🤍 Add to Wishlist';
}

// ── CHECKOUT ──────────────────────────────────────
async function loadCheckout() {
  const { ok, data } = await apiCall('/cart');
  if (!ok || !data.success || !data.cart.items.length) {
    showToast('Your cart is empty', 'info');
    navigate('cart');
    return;
  }
  STATE.cart = data.cart;

  // Prefill user info
  const me = STATE.user;
  if (me?.name) document.getElementById('sh-name').value = me.name;

  // Render items
  const shipping = STATE.cart.totalPrice >= 999 ? 0 : 99;
  const tax = Math.round(STATE.cart.totalPrice * 0.05);
  const grand = STATE.cart.totalPrice + shipping + tax;

  document.getElementById('checkoutItems').innerHTML = STATE.cart.items.map(item => {
    const p = item.product;
    if (!p) return '';
    return `<div class="checkout-item">
      <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/52?text=?'">
      <div class="checkout-item-info">
        <h4>${p.name}</h4>
        <span>Qty: ${item.quantity}</span>
      </div>
      <span class="checkout-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
    </div>`;
  }).join('');

  document.getElementById('checkoutTotals').innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>₹${STATE.cart.totalPrice.toLocaleString('en-IN')}</span></div>
    <div class="summary-row"><span>Shipping</span><span class="${shipping === 0 ? 'free-text' : ''}">${shipping === 0 ? 'FREE' : '₹' + shipping}</span></div>
    <div class="summary-row"><span>Tax (5%)</span><span>₹${tax.toLocaleString('en-IN')}</span></div>
    <div class="summary-row summary-total"><span>Grand Total</span><span>₹${grand.toLocaleString('en-IN')}</span></div>`;
}

async function placeOrder() {
  const name = document.getElementById('sh-name').value.trim();
  const phone = document.getElementById('sh-phone').value.trim();
  const address = document.getElementById('sh-address').value.trim();
  const city = document.getElementById('sh-city').value.trim();
  const state = document.getElementById('sh-state').value.trim();
  const pincode = document.getElementById('sh-pincode').value.trim();
  const country = document.getElementById('sh-country').value;

  if (!name || !phone || !address || !city || !state || !pincode) return showToast('Please fill all required fields', 'error');
  if (!/^\d{6}$/.test(pincode)) return showToast('Enter a valid 6-digit PIN code', 'error');

  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.innerHTML = '⏳ Creating order...';

  const { ok, data } = await apiCall('/orders/create', 'POST', {
    shippingAddress: { fullName: name, phone, address, city, state, pincode, country }
  });

  if (!ok || !data.success) {
    showToast(data.message || 'Failed to create order', 'error');
    btn.disabled = false;
    btn.innerHTML = 'Place Order & Pay';
    return;
  }

  // Open Razorpay
  const options = {
    key: data.keyId,
    amount: data.razorpayOrder.amount,
    currency: 'INR',
    name: 'ShopWave',
    description: 'Order Payment',
    order_id: data.razorpayOrder.id,
    handler: async function(response) {
      btn.innerHTML = '⏳ Verifying payment...';
      const verifyRes = await apiCall('/orders/verify', 'POST', {
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        orderId: data.order._id
      });
      if (verifyRes.ok && verifyRes.data.success) {
        showOrderSuccess(verifyRes.data.order);
      } else {
        showToast('Payment verification failed. Please contact support.', 'error');
        navigate('cart');
      }
      btn.disabled = false;
      btn.innerHTML = 'Place Order & Pay';
    },
    prefill: { name, contact: phone },
    theme: { color: '#4f46e5' },
    modal: {
      ondismiss: () => {
        btn.disabled = false;
        btn.innerHTML = 'Place Order & Pay';
        showToast('Payment cancelled', 'warning');
      }
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', () => {
      showToast('Payment failed. Please try again.', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Place Order & Pay';
    });
    rzp.open();
  } catch (e) {
    showToast('Could not open payment window. Make sure Razorpay keys are configured.', 'error');
    btn.disabled = false;
    btn.innerHTML = 'Place Order & Pay';
  }
}

function showOrderSuccess(order) {
  const ordId = order._id.toString().slice(-8).toUpperCase();
  document.getElementById('successOrderDetails').innerHTML = `
    <div class="order-detail-row"><span>Order ID</span><strong>#${ordId}</strong></div>
    <div class="order-detail-row"><span>Items</span><strong>${order.items.length} item(s)</strong></div>
    <div class="order-detail-row"><span>Total Paid</span><strong>₹${order.totalPrice.toLocaleString('en-IN')}</strong></div>
    <div class="order-detail-row"><span>Deliver To</span><strong>${order.shippingAddress?.city}, ${order.shippingAddress?.state}</strong></div>
    <div class="order-detail-row"><span>Payment</span><strong style="color:var(--success)">✅ Confirmed</strong></div>
  `;
  navigate('order-success');
  updateCartBadge();
  document.getElementById('cartBadge').textContent = '0';
}

// ── ORDERS ────────────────────────────────────────
async function loadOrders() {
  const list = document.getElementById('ordersList');
  const empty = document.getElementById('ordersEmpty');
  list.innerHTML = `<div style="text-align:center;padding:40px"><div class="loader-spinner" style="margin:0 auto"></div></div>`;

  const { ok, data } = await apiCall('/orders/my');
  if (!ok || !data.success) { showToast('Failed to load orders', 'error'); return; }

  if (!data.orders.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  list.innerHTML = data.orders.map(order => {
    const statusClass = `status-${order.status}`;
    return `<div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-id">Order #${order._id.toString().slice(-8).toUpperCase()}</div>
          <div class="order-date">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <span class="order-status-badge ${statusClass}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
      </div>
      <div class="order-items-preview">
        ${order.items.slice(0,4).map(item => `<img class="order-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/54?text=?'">`).join('')}
        ${order.items.length > 4 ? `<div style="display:flex;align-items:center;font-size:13px;color:var(--text-muted)">+${order.items.length - 4} more</div>` : ''}
      </div>
      <div class="order-card-footer">
        <div>
          <div class="order-total">₹${order.totalPrice.toLocaleString('en-IN')}</div>
          <div style="font-size:12px;color:var(--text-muted)">${order.items.reduce((s,i)=>s+i.quantity,0)} items</div>
        </div>
        <span style="font-size:13px;color:var(--text-secondary)">${order.isPaid ? '✅ Paid' : '⏳ Payment pending'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── PROFILE ───────────────────────────────────────
async function loadProfile() {
  const { ok, data } = await apiCall('/auth/me');
  if (!ok || !data.success) { showToast('Failed to load profile', 'error'); return; }
  const u = data.user;
  document.getElementById('prof-name').value = u.name || '';
  document.getElementById('prof-email').value = u.email || '';
  document.getElementById('prof-street').value = u.address?.street || '';
  document.getElementById('prof-city').value = u.address?.city || '';
  document.getElementById('prof-state').value = u.address?.state || '';
  document.getElementById('prof-pin').value = u.address?.pincode || '';
  document.getElementById('profileAvatar').textContent = u.name[0].toUpperCase();
}

async function updateProfile(e) {
  e.preventDefault();
  const { ok, data } = await apiCall('/auth/profile', 'PUT', {
    name: document.getElementById('prof-name').value,
    address: {
      street: document.getElementById('prof-street').value,
      city: document.getElementById('prof-city').value,
      state: document.getElementById('prof-state').value,
      pincode: document.getElementById('prof-pin').value,
    }
  });
  if (ok && data.success) {
    STATE.user = { ...STATE.user, name: data.user.name };
    saveToStorage();
    document.getElementById('userName').textContent = data.user.name.split(' ')[0];
    showToast('Profile updated successfully', 'success');
  } else {
    showToast(data.message || 'Update failed', 'error');
  }
}

// ── ADMIN ─────────────────────────────────────────
function showAdminTab(tab) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).style.display = 'block';
  event.target.classList.add('active');
  if (tab === 'products') loadAdminProducts();
}

async function loadAdminProducts() {
  const list = document.getElementById('adminProductList');
  list.innerHTML = `<div style="text-align:center;padding:32px"><div class="loader-spinner" style="margin:0 auto"></div></div>`;
  const { ok, data } = await apiCall('/products?limit=100');
  if (!ok || !data.success) { list.innerHTML = '<p>Failed to load</p>'; return; }
  list.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.products.map(p => `
          <tr>
            <td><img src="${p.image}" alt="${p.name}"></td>
            <td style="max-width:200px;font-weight:500">${p.name}</td>
            <td><span style="background:var(--primary-light);color:var(--primary);padding:3px 8px;border-radius:4px;font-size:12px;font-weight:600">${p.category}</span></td>
            <td style="font-weight:600">₹${p.price.toLocaleString('en-IN')}</td>
            <td>${p.stock}</td>
            <td>⭐ ${p.rating}</td>
            <td>
              <button class="btn-danger btn-sm" onclick="adminDeleteProduct('${p._id}')">Delete</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function adminAddProduct(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('adm-name').value,
    description: document.getElementById('adm-desc').value,
    price: Number(document.getElementById('adm-price').value),
    originalPrice: Number(document.getElementById('adm-oprice').value) || Number(document.getElementById('adm-price').value),
    category: document.getElementById('adm-cat').value,
    brand: document.getElementById('adm-brand').value,
    image: document.getElementById('adm-img').value,
    stock: Number(document.getElementById('adm-stock').value) || 50,
    rating: Number(document.getElementById('adm-rating').value) || 4.0,
    featured: document.getElementById('adm-featured').checked,
  };
  const { ok, data } = await apiCall('/products', 'POST', body);
  if (ok && data.success) {
    showToast('Product added successfully!', 'success');
    e.target.reset();
    showAdminTab('products');
  } else {
    showToast(data.message || 'Failed to add product', 'error');
  }
}

async function adminDeleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  const { ok } = await apiCall(`/products/${id}`, 'DELETE');
  if (ok) { showToast('Product deleted', 'info'); loadAdminProducts(); }
  else showToast('Failed to delete', 'error');
}
