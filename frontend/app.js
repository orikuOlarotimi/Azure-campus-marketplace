/**
 * Campus Marketplace — Frontend JavaScript
 * Communicates with Azure Functions API (/api/listings)
 * Azure Static Web Apps routes all /api/* calls to Azure Functions,
 * so no absolute URL or CORS issue.
 */

/* ── Constants ── */
const API_BASE = '/api/listings';

/* ── DOM refs ── */
const listingsGrid     = document.getElementById('listings-grid');
const emptyState       = document.getElementById('empty-state');
const errorState       = document.getElementById('error-state');
const listingCountBadge = document.getElementById('listing-count-badge');
const openModalBtn     = document.getElementById('open-modal-btn');
const closeModalBtn    = document.getElementById('close-modal-btn');
const modalOverlay     = document.getElementById('modal-overlay');
const listingForm      = document.getElementById('listing-form');
const submitBtn        = document.getElementById('submit-btn');
const submitLabel      = document.getElementById('submit-label');
const submitSpinner    = document.getElementById('submit-spinner');
const formError        = document.getElementById('form-error');
const formSuccess      = document.getElementById('form-success');
const postAnotherBtn   = document.getElementById('post-another-btn');
const descTextarea     = document.getElementById('input-description');
const descCounter      = document.getElementById('desc-counter');
const footerYear       = document.getElementById('footer-year');
const filterBtns       = document.querySelectorAll('.filter-btn');

/* ── State ── */
let allListings   = [];   // cache from API
let activeFilter  = 'all';

/* ── Initialise ── */
footerYear.textContent = new Date().getFullYear();
fetchListings();

/* ═════════════════════════════════════════
   API CALLS
═════════════════════════════════════════ */

/**
 * GET /api/listings — fetch all listings and render them.
 */
async function fetchListings() {
  try {
    showSkeletons();
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();

    // Sort newest first
    allListings = (data.listings || data || []).sort(
      (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
    );

    renderListings(allListings);
    updateBadge(allListings.length);
  } catch (err) {
    console.error('fetchListings error:', err);
    clearGrid();
    errorState.classList.remove('hidden');
    updateBadge(0);
  }
}

/**
 * POST /api/listings — submit a new listing.
 * @param {object} payload
 */
async function postListing(payload) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Server responded ${res.status}`);
  }
  return res.json();
}

/* ═════════════════════════════════════════
   RENDERING
═════════════════════════════════════════ */

function renderListings(listings) {
  clearGrid();

  const filtered = activeFilter === 'all'
    ? listings
    : listings.filter(l => l.category === activeFilter);

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((listing, i) => {
    const card = buildCard(listing, i);
    fragment.appendChild(card);
  });
  listingsGrid.appendChild(fragment);
}

function buildCard(listing, index) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.animationDelay = `${index * 45}ms`;

  const isLost  = listing.category === 'Lost & Found';
  const tagClass = isLost ? 'lost' : 'sale';
  const tagIcon  = isLost ? '🔍' : '🛒';

  const date = listing.postedAt
    ? formatDate(listing.postedAt)
    : 'Just now';

  const contactHTML = listing.contact
    ? `<span class="card-contact" title="${escHtml(listing.contact)}">${escHtml(listing.contact)}</span>`
    : '<span class="card-contact"></span>';

  card.innerHTML = `
    <span class="card-tag ${tagClass}">${tagIcon} ${escHtml(listing.category)}</span>
    <h3 class="card-title">${escHtml(listing.title)}</h3>
    <p class="card-description">${escHtml(listing.description)}</p>
    <div class="card-footer">
      ${contactHTML}
      <time class="card-date" datetime="${listing.postedAt || ''}">${date}</time>
    </div>
  `;
  return card;
}

function showSkeletons() {
  clearGrid();
  for (let i = 0; i < 6; i++) {
    const div = document.createElement('div');
    div.className = 'card skeleton';
    listingsGrid.appendChild(div);
  }
}

function clearGrid() {
  listingsGrid.innerHTML = '';
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
}

function updateBadge(count) {
  listingCountBadge.textContent = count === 1 ? '1 listing' : `${count} listings`;
}

/* ═════════════════════════════════════════
   FILTER
═════════════════════════════════════════ */

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderListings(allListings);
  });
});

/* ═════════════════════════════════════════
   MODAL
═════════════════════════════════════════ */

function openModal() {
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.getElementById('input-title').focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  resetForm();
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
});

/* ═════════════════════════════════════════
   FORM
═════════════════════════════════════════ */

/* Character counter for description */
descTextarea.addEventListener('input', () => {
  descCounter.textContent = descTextarea.value.length;
});

/* Form submission */
listingForm.addEventListener('submit', async e => {
  e.preventDefault();

  // Clear previous errors
  formError.classList.add('hidden');
  formError.textContent = '';
  clearInvalid();

  // Gather values
  const title       = listingForm.elements['title'].value.trim();
  const category    = listingForm.elements['category'].value;
  const description = listingForm.elements['description'].value.trim();
  const contact     = listingForm.elements['contact'].value.trim();

  // Client-side validation
  const errors = [];
  if (!title)       { markInvalid('input-title');       errors.push('Title is required.'); }
  if (!category)    { markInvalid('input-category');    errors.push('Please select a category.'); }
  if (!description) { markInvalid('input-description'); errors.push('Description is required.'); }

  if (errors.length) {
    showFormError(errors.join(' '));
    return;
  }

  // Submit
  setSubmitting(true);
  try {
    const newListing = await postListing({ title, category, description, contact });

    // Optimistically prepend to local cache
    const merged = [newListing, ...allListings];
    allListings = merged;
    renderListings(allListings);
    updateBadge(allListings.length);

    // Show success state inside modal
    listingForm.classList.add('hidden');
    formSuccess.classList.remove('hidden');
  } catch (err) {
    showFormError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setSubmitting(false);
  }
});

postAnotherBtn.addEventListener('click', () => {
  listingForm.classList.remove('hidden');
  formSuccess.classList.add('hidden');
  listingForm.reset();
  descCounter.textContent = '0';
  document.getElementById('input-title').focus();
});

/* ── Form helpers ── */
function setSubmitting(loading) {
  submitBtn.disabled     = loading;
  submitLabel.textContent = loading ? 'Submitting…' : 'Submit Listing';
  submitSpinner.classList.toggle('hidden', !loading);
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function markInvalid(id) {
  document.getElementById(id)?.classList.add('invalid');
}

function clearInvalid() {
  listingForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function resetForm() {
  listingForm.reset();
  listingForm.classList.remove('hidden');
  formSuccess.classList.add('hidden');
  formError.classList.add('hidden');
  descCounter.textContent = '0';
  clearInvalid();
  setSubmitting(false);
}

/* ═════════════════════════════════════════
   UTILITIES
═════════════════════════════════════════ */

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diff = (now - d) / 1000; // seconds

    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Simple HTML escape to prevent XSS */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
