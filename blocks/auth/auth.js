import { getUsers, saveUser, setCurrentUser, getCurrentUser, migrateLegacyData, toast } from '../../scripts/cart-store.js';

export default function decorate(block) {
  if (getCurrentUser()) { window.location.href = '/'; return; }

  block.innerHTML = `
    <div class="auth-card section-card">
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab active" role="tab" data-tab="login" aria-selected="true" aria-controls="auth-login">Sign In</button>
        <button class="auth-tab" role="tab" data-tab="signup" aria-selected="false" aria-controls="auth-signup">Create Account</button>
      </div>
      <div id="auth-login" class="auth-panel">
        <form class="auth-form" id="login-form" novalidate>
          <div class="form-group"><label for="login-phone">Phone Number</label>
            <input type="tel" id="login-phone" name="phone" placeholder="10-digit phone" autocomplete="tel" required maxlength="10" inputmode="numeric"></div>
          <div class="form-group"><label for="login-password">Password</label>
            <input type="password" id="login-password" name="password" placeholder="Enter password" autocomplete="current-password" required></div>
          <p class="auth-error" id="login-error" role="alert" hidden></p>
          <button type="submit" class="button primary auth-submit">Sign In</button>
        </form>
      </div>
      <div id="auth-signup" class="auth-panel hidden">
        <form class="auth-form" id="signup-form" novalidate>
          <div class="form-group"><label for="signup-name">Full Name</label>
            <input type="text" id="signup-name" name="name" placeholder="Your full name" autocomplete="name" required></div>
          <div class="form-group"><label for="signup-phone">Phone Number</label>
            <input type="tel" id="signup-phone" name="phone" placeholder="10-digit phone" autocomplete="tel" required maxlength="10" inputmode="numeric"></div>
          <div class="form-group"><label for="signup-password">Password</label>
            <input type="password" id="signup-password" name="password" placeholder="Min 6 characters" autocomplete="new-password" required minlength="6"></div>
          <div class="form-group"><label for="signup-confirm">Confirm Password</label>
            <input type="password" id="signup-confirm" name="confirm" placeholder="Repeat password" autocomplete="new-password" required></div>
          <p class="auth-error" id="signup-error" role="alert" hidden></p>
          <button type="submit" class="button primary auth-submit">Create Account</button>
        </form>
      </div>
    </div>`;

  block.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      block.querySelectorAll('.auth-tab').forEach((t) => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      block.querySelectorAll('.auth-panel').forEach((p) => p.classList.add('hidden'));
      tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
      block.querySelector(`#auth-${tab.dataset.tab}`)?.classList.remove('hidden');
    });
  });

  if (window.location.hash === '#signup') block.querySelector('[data-tab="signup"]')?.click();

  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = e.target.phone.value.trim();
    const password = e.target.password.value;
    const errEl = document.getElementById('login-error');
    const user = getUsers().find((u) => u.phone === phone);
    if (!user || user.password !== password) {
      errEl.textContent = 'Phone number or password is incorrect.'; errEl.hidden = false; return;
    }
    errEl.hidden = true;
    setCurrentUser(phone); migrateLegacyData(phone);
    toast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    setTimeout(() => { window.location.href = '/'; }, 500);
  });

  document.getElementById('signup-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const phone = e.target.phone.value.trim();
    const password = e.target.password.value;
    const confirm = e.target.confirm.value;
    const errEl = document.getElementById('signup-error');
    if (!/^\d{10}$/.test(phone)) { errEl.textContent = 'Enter a valid 10-digit phone number.'; errEl.hidden = false; return; }
    if (password.length < 6)    { errEl.textContent = 'Password must be at least 6 characters.'; errEl.hidden = false; return; }
    if (password !== confirm)   { errEl.textContent = 'Passwords do not match.'; errEl.hidden = false; return; }
    if (getUsers().find((u) => u.phone === phone)) { errEl.textContent = 'Account with this number already exists.'; errEl.hidden = false; return; }
    errEl.hidden = true;
    saveUser({ name, phone, password }); setCurrentUser(phone); migrateLegacyData(phone);
    toast(`Welcome, ${name.split(' ')[0]}!`, 'success');
    setTimeout(() => { window.location.href = '/'; }, 500);
  });
}