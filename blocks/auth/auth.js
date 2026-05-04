import {
  getUsers,
  saveUser,
  setCurrentUser,
  getCurrentUser,
  migrateLegacyData,
  toast,
} from '../../scripts/cart-store.js';

function params() {
  return new URLSearchParams(window.location.search);
}

function normalizeRedirect(value) {
  if (!value) return '/';
  const cleaned = value.replace(/\.html$/i, '').replace(/^index$/i, '');
  if (!cleaned || cleaned === '/') return '/';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

function validateName(name) {
  return /^[A-Za-z][A-Za-z ]{1,49}$/.test(name.trim());
}

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

function sanitize(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const key = cells[0].textContent.trim().toLowerCase();
    const value = cells[1].textContent.trim();
    if (key) config[key] = value;
  });
  return {
    eyebrow: config.eyebrow || 'Member access',
    title: config.title || 'Welcome to Adokicks',
    intro: config.intro || 'Sign in to access your bag, wishlist, and order history, or create a new account in seconds.',
    benefit1: config.benefit1 || 'Faster checkout with saved profile details',
    benefit2: config.benefit2 || 'Track orders and delivery updates',
    benefit3: config.benefit3 || 'Save your favorite shoes in wishlist',
  };
}

async function sha256(input) {
  if (!window.crypto || !window.crypto.subtle) {
    return `fallback_${btoa(unescape(encodeURIComponent(input))).replaceAll('=', '')}`;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function renderAuthMarkup(block, config) {
  block.innerHTML = `
    <section class="auth-shell" aria-label="Login and registration">
      <aside class="auth-intro section-card" aria-label="Adokicks account benefits">
        <p class="eyebrow">${sanitize(config.eyebrow)}</p>
        <h1>${sanitize(config.title)}</h1>
        <p>${sanitize(config.intro)}</p>
        <ul class="auth-points" aria-label="Benefits of signing in">
          <li>${sanitize(config.benefit1)}</li>
          <li>${sanitize(config.benefit2)}</li>
          <li>${sanitize(config.benefit3)}</li>
        </ul>
      </aside>

      <section class="auth-section" aria-label="Authentication forms">
        <div class="auth-toggle" role="tablist" aria-label="Choose authentication mode">
          <button id="login-tab" class="toggle-btn active" role="tab" aria-selected="true" aria-controls="login-form" type="button">Login</button>
          <button id="signup-tab" class="toggle-btn" role="tab" aria-selected="false" aria-controls="signup-form" type="button">Sign Up</button>
        </div>

        <p id="auth-message" class="auth-message hidden" role="alert" aria-live="polite"></p>

        <form id="login-form" class="auth-form" novalidate aria-label="Login form">
          <label for="login-phone">Phone Number</label>
          <input id="login-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required aria-label="Login phone number">
          <label for="login-password">Password</label>
          <input id="login-password" name="password" type="password" autocomplete="current-password" required aria-label="Login password">
          <button type="submit" class="btn-primary" aria-label="Sign in">Sign In</button>
        </form>

        <form id="signup-form" class="auth-form hidden" novalidate aria-label="Signup form">
          <div class="signup-grid" aria-label="Signup grouped fields">
            <div class="auth-field">
              <label for="signup-name">Full Name</label>
              <input id="signup-name" name="name" type="text" autocomplete="name" required aria-label="Your full name">
            </div>
            <div class="auth-field">
              <label for="signup-phone">Phone Number</label>
              <input id="signup-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required aria-label="Signup phone number">
            </div>
            <div class="auth-field">
              <label for="signup-password">Password</label>
              <input id="signup-password" name="password" type="password" autocomplete="new-password" required aria-label="Create password">
            </div>
            <div class="auth-field">
              <label for="signup-confirm-password">Confirm Password</label>
              <input id="signup-confirm-password" name="confirmPassword" type="password" autocomplete="new-password" required aria-label="Confirm password">
            </div>
          </div>
          <button type="submit" class="btn-primary" aria-label="Create account">Create Account</button>
        </form>
      </section>
    </section>
  `;
}

export default function decorate(block) {
  document.body.dataset.page = 'auth';
  const config = getConfig(block);
  if (getCurrentUser()) {
    window.location.href = normalizeRedirect(params().get('redirect'));
    return;
  }

  renderAuthMarkup(block, config);

  const loginTab = block.querySelector('#login-tab');
  const signupTab = block.querySelector('#signup-tab');
  const loginForm = block.querySelector('#login-form');
  const signupForm = block.querySelector('#signup-form');
  const authMessage = block.querySelector('#auth-message');

  function setAuthMessage(message) {
    authMessage.textContent = message;
    authMessage.classList.toggle('hidden', !message);
  }

  function showLogin() {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginTab.setAttribute('aria-selected', 'true');
    signupTab.setAttribute('aria-selected', 'false');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    setAuthMessage('');
  }

  function showSignup() {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupTab.setAttribute('aria-selected', 'true');
    loginTab.setAttribute('aria-selected', 'false');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    setAuthMessage('');
  }

  if (params().get('notice') === 'please_login') {
    setAuthMessage('Please login to continue.');
  }

  loginTab.addEventListener('click', showLogin);
  signupTab.addEventListener('click', showSignup);
  if (window.location.hash === '#signup') showSignup();

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const phone = String(form.get('phone') || '').trim();
    const password = String(form.get('password') || '');

    if (!validatePhone(phone)) {
      setAuthMessage('Enter a valid 10 digit phone number.');
      return;
    }
    if (!password) {
      setAuthMessage('Password is required.');
      return;
    }

    const user = getUsers().find((entry) => entry.phone === phone);
    if (!user) {
      setAuthMessage('No account found for this phone number.');
      return;
    }

    const hashed = await sha256(password);
    if (user.passwordHash ? hashed !== user.passwordHash : password !== user.password) {
      setAuthMessage('Incorrect password.');
      return;
    }

    setCurrentUser(user.phone);
    migrateLegacyData(user.phone);
    setAuthMessage('');
    toast('Login successful', 'success');
    window.location.href = normalizeRedirect(params().get('redirect'));
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(signupForm);
    const name = String(form.get('name') || '').trim();
    const phone = String(form.get('phone') || '').trim();
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirmPassword') || '');

    if (!validateName(name)) {
      setAuthMessage('Enter a valid name (letters and spaces, 2-50 chars).');
      return;
    }
    if (!validatePhone(phone)) {
      setAuthMessage('Enter a valid 10 digit phone number.');
      return;
    }
    if (!validatePassword(password)) {
      setAuthMessage('Password must be at least 8 characters with uppercase, lowercase, and number.');
      return;
    }
    if (password !== confirm) {
      setAuthMessage('Password and confirm password must match.');
      return;
    }
    if (getUsers().some((entry) => entry.phone === phone)) {
      setAuthMessage('This phone number is already registered.');
      return;
    }

    const passwordHash = await sha256(password);
    saveUser({ name, phone, passwordHash });
    setCurrentUser(phone);
    migrateLegacyData(phone);
    setAuthMessage('');
    toast('Account created successfully', 'success');
    window.location.href = normalizeRedirect(params().get('redirect'));
  });
}
