/**************************************************************
 * LifeBlood - script.js (PART 1)
 * Core utilities, donor registration, requests, modal & helpers
 **************************************************************/

/* ===========================
   LOCAL STORAGE KEYS & HELPERS
   =========================== */
const STORAGE_KEYS = {
  DONORS: 'lifeblood_donors',
  REQUESTS: 'lifeblood_requests'
};

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

/* ===========================
   ID GENERATOR (simple)
   =========================== */
function uid(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ===========================
   COMMON UI HELPERS
   =========================== */
function showFormMessage(containerSelectorOrElem, message, type = 'success') {
  const container = typeof containerSelectorOrElem === 'string'
    ? document.querySelector(containerSelectorOrElem)
    : containerSelectorOrElem;
  if (!container) return;
  container.textContent = message;
  container.classList.remove('success', 'error');
  container.classList.add(type);
  container.style.display = 'block';
  // auto-hide after 4s
  setTimeout(() => {
    container.style.display = 'none';
  }, 4000);
}

function setCurrentYearInAll() {
  const el1 = document.getElementById('currentYear');
  const el2 = document.getElementById('year');
  const year = new Date().getFullYear();
  if (el1) el1.textContent = year;
  if (el2) el2.textContent = year;
}

/* ===========================
   NAV TOGGLE (mobile)
   =========================== */
function initNavToggle() {
  const toggles = document.querySelectorAll('.nav-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      // find nearest .nav-links or #mainNav
      const navLinks = document.querySelector('.nav-links') || document.getElementById('mainNav');
      if (!navLinks) return;
      navLinks.classList.toggle('show');
    });
  });

  // close nav when clicking outside on small screens
  document.addEventListener('click', (e) => {
    const navLinks = document.querySelector('.nav-links');
    const toggle = document.querySelector('.nav-toggle');
    if (!navLinks || !toggle) return;
    if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
      navLinks.classList.remove('show');
    }
  });
}

/* ===========================
   HOMEPAGE STATISTICS UPDATER
   =========================== */
function updateHomepageStats() {
  const donors = loadFromStorage(STORAGE_KEYS.DONORS);
  const requests = loadFromStorage(STORAGE_KEYS.REQUESTS);
  const totalDonorsEl = document.getElementById('totalDonors');
  const totalRequestsEl = document.getElementById('totalRequests');
  if (totalDonorsEl) totalDonorsEl.textContent = donors.length;
  if (totalRequestsEl) totalRequestsEl.textContent = requests.length;
}

/* ===========================
   AVAILABILITY TEXT HANDLER (registration page)
   =========================== */
function initAvailabilityToggle() {
  const availabilityInput = document.getElementById('availability');
  const availabilityText = document.getElementById('availabilityText');
  if (!availabilityInput || !availabilityText) return;
  function updateText() {
    availabilityText.textContent = availabilityInput.checked ? 'Available to donate' : 'Not available';
    availabilityText.classList.toggle('available', availabilityInput.checked);
    availabilityText.classList.toggle('unavailable', !availabilityInput.checked);
  }
  availabilityInput.addEventListener('change', updateText);
  updateText();
}

/* ===========================
   SAVE DONOR (from register.html)
   =========================== */
function saveDonorFromForm(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('donorForm');
  if (!form) return;

  // gather values
  const fullName = form.fullName.value.trim();
  const age = Number(form.age.value);
  const gender = form.gender.value;
  const bloodGroup = form.bloodGroup.value;
  const phone = form.phone.value.trim();
  const email = form.email.value.trim();
  const city = form.city.value.trim();
  const availability = form.availability.checked;

  // basic validation
  if (!fullName || !age || !gender || !bloodGroup || !phone || !city) {
    showFormMessage('#donorMessage', 'Please complete all required fields.', 'error');
    return;
  }

  const donors = loadFromStorage(STORAGE_KEYS.DONORS);

  // create donor record
  const donor = {
    id: uid('donor_'),
    fullName,
    age,
    gender,
    bloodGroup,
    phone,
    email,
    city,
    availability,
    createdAt: new Date().toISOString()
  };

  donors.unshift(donor); // newest first
  saveToStorage(STORAGE_KEYS.DONORS, donors);

  showFormMessage('#donorMessage', 'Donor profile saved successfully.', 'success');

  // reset form
  form.reset();
  // reset availability default to checked (or you can set false)
  const avail = document.getElementById('availability');
  if (avail) avail.checked = true;
  initAvailabilityToggle();

  // update homepage counters and donor list filters
  updateHomepageStats();
  populateFilterCities();
  // optionally redirect to donor list after short delay
  setTimeout(() => {
    // if donorlist exists -> open
    if (location.pathname.endsWith('register.html') || location.pathname.endsWith('/')) {
      window.location.href = 'donorlist.html';
    }
  }, 700);
}

/* ===========================
   SAVE REQUEST (requests.html)
   =========================== */
function saveRequestFromForm(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('requestForm');
  if (!form) return;

  const patientName = form.patientName.value.trim();
  const requiredBloodGroup = form.requiredBloodGroup.value;
  const hospital = form.hospital.value.trim();
  const requestCity = form.requestCity.value.trim();
  const contactNumber = form.contactNumber.value.trim();

  if (!patientName || !requiredBloodGroup || !hospital || !requestCity || !contactNumber) {
    showFormMessage('#requestMessage', 'Please fill all required fields.', 'error');
    return;
  }

  const requests = loadFromStorage(STORAGE_KEYS.REQUESTS);
  const request = {
    id: uid('req_'),
    patientName,
    requiredBloodGroup,
    hospital,
    requestCity,
    contactNumber,
    createdAt: new Date().toISOString()
  };

  requests.unshift(request);
  saveToStorage(STORAGE_KEYS.REQUESTS, requests);

  showFormMessage('#requestMessage', 'Your blood request has been posted.', 'success');

  // perform smart matching and show modal
  const matches = matchDonors(request.requiredBloodGroup, request.requestCity);
  renderMatchResults(matches);

  // show modal confirmation (if present)
  showModal('requestModal');

  // update homepage stats
  updateHomepageStats();
}



/**************************************************************
 * LifeBlood - script.js (PART 2)
 * Matching, rendering lists, filters, eligibility checker,
 * modal handling and init
 **************************************************************/

/* ===========================
   MATCHING LOGIC
   - matchDonors(bloodGroup, city)
   - blood compatibility (basic exact match) - can be extended
   =========================== */

function isSameCity(aCity, bCity) {
  if (!aCity || !bCity) return false;
  return aCity.trim().toLowerCase() === bCity.trim().toLowerCase();
}

/**
 * matchDonors: return donors matching blood group and city.
 * For simplicity we do exact blood-group match + exact city match.
 * You can extend compatibility mapping later.
 */
function matchDonors(bloodGroup, city) {
  const donors = loadFromStorage(STORAGE_KEYS.DONORS);
  if (!bloodGroup || !city) return [];
  return donors.filter(d => {
    return d.bloodGroup === bloodGroup && isSameCity(d.city, city) && d.availability;
  });
}

/* ===========================
   RENDER MATCH RESULTS (requests.html)
   =========================== */
function renderMatchResults(matches) {
  const container = document.getElementById('matchResults');
  if (!container) return;
  container.innerHTML = '';

  if (!matches || matches.length === 0) {
    container.innerHTML = `<div class="empty-state" style="display:block;">
      <i class="fa-solid fa-user-xmark"></i>
      <p>No matching donors found in this city.</p>
    </div>`;
    return;
  }

  matches.forEach(d => {
    const card = document.createElement('article');
    card.className = 'match-card card';
    card.innerHTML = `
      <div class="donor-header">
        <h3>${escapeHTML(d.fullName)}</h3>
        <div class="donor-availability available">Available</div>
      </div>
      <div class="donor-meta">
        <p><strong>Blood Group:</strong> ${escapeHTML(d.bloodGroup)}</p>
        <p><strong>City:</strong> ${escapeHTML(d.city)}</p>
        <p><strong>Phone:</strong> <a href="tel:${encodeURIComponent(d.phone)}">${escapeHTML(d.phone)}</a></p>
        ${d.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHTML(d.email)}">${escapeHTML(d.email)}</a></p>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

/* ===========================
   RENDER DONOR LIST (donorlist.html)
   - includes search + filters
   =========================== */
function renderDonorList(filter = {}) {
  const donors = loadFromStorage(STORAGE_KEYS.DONORS);
  const container = document.getElementById('donorCards');
  const emptyState = document.getElementById('donorEmptyState');
  if (!container || !emptyState) return;

  // apply filters
  let results = donors.slice(); // clone
  if (filter.q) {
    const q = filter.q.toLowerCase();
    results = results.filter(d => (d.fullName || '').toLowerCase().includes(q));
  }
  if (filter.bloodGroup && filter.bloodGroup !== 'all') {
    results = results.filter(d => d.bloodGroup === filter.bloodGroup);
  }
  if (filter.city && filter.city !== 'all') {
    results = results.filter(d => (d.city || '').toLowerCase() === filter.city.toLowerCase());
  }
  if (filter.availability && filter.availability !== 'all') {
    results = results.filter(d => (filter.availability === 'available') ? d.availability : !d.availability);
  }

  container.innerHTML = '';

  if (results.length === 0) {
    emptyState.style.display = 'block';
    return;
  } else {
    emptyState.style.display = 'none';
  }

  results.forEach(d => {
    const card = document.createElement('article');
    card.className = 'donor-card card';
    card.innerHTML = `
      <div class="donor-header">
        <h3>${escapeHTML(d.fullName)}</h3>
        <div>
          <span class="donor-blood">${escapeHTML(d.bloodGroup)}</span>
        </div>
      </div>
      <div class="donor-meta">
        <p><strong>City:</strong> ${escapeHTML(d.city)}</p>
        <p><strong>Age:</strong> ${escapeHTML(String(d.age))} • <strong>Gender:</strong> ${escapeHTML(d.gender)}</p>
        <p><strong>Phone:</strong> <a href="tel:${encodeURIComponent(d.phone)}">${escapeHTML(d.phone)}</a></p>
        ${d.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeHTML(d.email)}">${escapeHTML(d.email)}</a></p>` : ''}
        <p class="donor-availability ${d.availability ? 'available' : 'unavailable'}">
          ${d.availability ? 'Available' : 'Not available'}
        </p>
        <div style="margin-top:10px;">
          <button class="btn btn-ghost btn-small contact-btn" data-phone="${escapeHTML(d.phone)}">
            <i class="fa-solid fa-phone"></i> Contact
          </button>
          <button class="btn btn-outline btn-small toggle-availability" data-id="${escapeHTML(d.id)}">
            <i class="fa-solid fa-toggle-on"></i> Toggle Availability
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // attach listeners for contact and toggle availability
  document.querySelectorAll('.toggle-availability').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      toggleDonorAvailability(id);
    });
  });

  document.querySelectorAll('.contact-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phone = btn.dataset.phone;
      if (phone) {
        // attempt to open phone dialer
        window.location.href = `tel:${phone}`;
      }
    });
  });
}

/* ===========================
   TOGGLE DONOR AVAILABILITY (inline in donor list)
   =========================== */
function toggleDonorAvailability(donorId) {
  if (!donorId) return;
  const donors = loadFromStorage(STORAGE_KEYS.DONORS);
  const idx = donors.findIndex(d => d.id === donorId);
  if (idx === -1) return;
  donors[idx].availability = !donors[idx].availability;
  saveToStorage(STORAGE_KEYS.DONORS, donors);
  // re-render donor list & update stats
  renderDonorList(getCurrentFiltersFromUI());
  updateHomepageStats();
}

/* ===========================
   POPULATE FILTER CITIES (donorlist)
   =========================== */
function populateFilterCities() {
  const donors = loadFromStorage(STORAGE_KEYS.DONORS);
  const citySet = new Set();
  donors.forEach(d => {
    if (d.city) citySet.add(d.city.trim());
  });
  const select = document.getElementById('filterCity');
  if (!select) return;
  // clear existing except "all"
  const currentVal = select.value || 'all';
  select.innerHTML = `<option value="all">All cities</option>`;
  Array.from(citySet).sort().forEach(city => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    select.appendChild(opt);
  });
  // restore value if present
  if (Array.from(select.options).some(o=>o.value === currentVal)) {
    select.value = currentVal;
  }
}

/* ===========================
   FILTERS - READ UI, APPLY
   =========================== */
function getCurrentFiltersFromUI() {
  const q = document.getElementById('searchInput') ? document.getElementById('searchInput').value.trim() : '';
  const bloodGroup = document.getElementById('filterBloodGroup') ? document.getElementById('filterBloodGroup').value : 'all';
  const city = document.getElementById('filterCity') ? document.getElementById('filterCity').value : 'all';
  const availability = document.getElementById('filterAvailability') ? document.getElementById('filterAvailability').value : 'all';
  return { q, bloodGroup, city, availability };
}

function applyFiltersFromUI() {
  const filters = getCurrentFiltersFromUI();
  renderDonorList(filters);
}

/* ===========================
   CLEAR FILTERS
   =========================== */
function initClearFilters() {
  const btn = document.getElementById('clearFiltersBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const search = document.getElementById('searchInput');
    const blood = document.getElementById('filterBloodGroup');
    const city = document.getElementById('filterCity');
    const avail = document.getElementById('filterAvailability');
    if (search) search.value = '';
    if (blood) blood.value = 'all';
    if (city) city.value = 'all';
    if (avail) avail.value = 'all';
    applyFiltersFromUI();
  });
}

/* ===========================
   MODAL HELPERS
   =========================== */
function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');

  // close buttons
  modal.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(modal));
  });
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));

  // clicking overlay closes modal
  const overlay = modal.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', () => closeModal(modal));
}

function closeModal(modalElemOrId) {
  const modal = typeof modalElemOrId === 'string' ? document.getElementById(modalElemOrId) : modalElemOrId;
  if (!modal) return;
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

/* ===========================
   ELIGIBILITY CHECKER
   =========================== */
function checkEligibilityHandler(e) {
  if (e) e.preventDefault();
  const form = document.getElementById('eligibilityForm');
  if (!form) return;

  const age = Number(document.getElementById('eligAge').value);
  const diseasesInput = form.querySelector('input[name="diseases"]:checked');
  const donatedRecentlyInput = form.querySelector('input[name="donatedRecently"]:checked');

  const resultEl = document.getElementById('eligibilityResult');
  if (!resultEl) return;

  // validation
  if (!age || !diseasesInput || !donatedRecentlyInput) {
      resultEl.classList.remove('hidden', 'success', 'error');
      resultEl.innerHTML = `
        <div class="result-card error">
            <h3>Incomplete</h3>
            <p>Please answer all questions.</p>
        </div>`;
      resultEl.style.display = 'block';
      return;
  }

  const hasDisease = diseasesInput.value === 'yes';
  const donatedRecently = donatedRecentlyInput.value === 'yes';

  let eligible = true;
  let message = "";

  if (age < 18 || age > 70) {
      eligible = false;
      message = `Your age (${age}) is outside the safe donation range.`;
  } else if (hasDisease) {
      eligible = false;
      message = "Because you have a chronic illness, you are not eligible to donate.";
  } else if (donatedRecently) {
      eligible = false;
      message = "You donated recently. Wait at least 90 days before donating again.";
  } else {
      eligible = true;
      message = "You are likely eligible to donate! Please verify at a medical center.";
  }

  // FIX: Remove hidden class so it becomes visible
  resultEl.classList.remove('hidden', 'success', 'error');

  resultEl.innerHTML = `
    <div class="result-card ${eligible ? 'success' : 'error'}">
        <h3>${eligible ? 'Likely Eligible' : 'Not Eligible'}</h3>
        <p>${escapeHTML(message)}</p>
    </div>
  `;
  resultEl.style.display = 'block';
}


/* ===========================
   ESCAPE HTML (simple)
   =========================== */
function escapeHTML(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ===========================
   BIND EVENTS ON LOAD
   =========================== */
function initAppBindings() {
  // universal things
  initNavToggle();
  setCurrentYearInAll();
  updateHomepageStats();

  // registration page
  const donorForm = document.getElementById('donorForm');
  if (donorForm) {
    donorForm.addEventListener('submit', saveDonorFromForm);
    initAvailabilityToggle();
  }

  // requests page
  const requestForm = document.getElementById('requestForm');
  if (requestForm) {
    requestForm.addEventListener('submit', saveRequestFromForm);
    // modal buttons (view donors)
    document.getElementById('modalViewDonors')?.addEventListener('click', () => {
      closeModal('requestModal');
      window.location.href = 'donorlist.html';
    });
    document.getElementById('modalNewRequest')?.addEventListener('click', () => {
      closeModal('requestModal');
      // clear form
      requestForm.reset();
      document.getElementById('matchResults').innerHTML = '';
    });
  }

  // donor list page
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFiltersFromUI();
    });
  }
  const filterBlood = document.getElementById('filterBloodGroup');
  if (filterBlood) filterBlood.addEventListener('change', applyFiltersFromUI);
  const filterCity = document.getElementById('filterCity');
  if (filterCity) filterCity.addEventListener('change', applyFiltersFromUI);
  const filterAvailability = document.getElementById('filterAvailability');
  if (filterAvailability) filterAvailability.addEventListener('change', applyFiltersFromUI);

  initClearFilters();

  // eligibility page
  const eligForm = document.getElementById('eligibilityForm');
  if (eligForm) eligForm.addEventListener('submit', checkEligibilityHandler);

  // initial render for donor list & populate cities
  populateFilterCities();
  renderDonorList(getCurrentFiltersFromUI());
}

/* Initialize on DOMContentLoaded */
document.addEventListener('DOMContentLoaded', () => {
  initAppBindings();
  // update homepage stats after DOM ready (in case donors exist)
  updateHomepageStats();
  // If on requests page and there is a most recent request, show matches automatically
  if (location.pathname.includes('requests.html')) {
    const requests = loadFromStorage(STORAGE_KEYS.REQUESTS);
    if (requests && requests.length > 0) {
      const lastReq = requests[0];
      const matches = matchDonors(lastReq.requiredBloodGroup, lastReq.requestCity);
      renderMatchResults(matches);
    }
  }
});

