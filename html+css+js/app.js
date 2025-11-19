const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const LOCK_KEY = 'p911_lock_unlocked';
const SITE_PASSWORD = '911';
const lockModal = document.getElementById('siteLockModal');
const lockForm = document.getElementById('lockForm');
const lockError = document.getElementById('lockError');
const maybeShowLock = () => {
  try {
    const unlocked = localStorage.getItem(LOCK_KEY) === 'true';
    if (lockModal && !unlocked) {
      lockModal.classList.add('show');
      lockModal.setAttribute('aria-hidden', 'false');
    }
  } catch {}
};
lockForm?.addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('lockPassword');
  const val = (input && 'value' in input) ? input.value : '';
  if (val === SITE_PASSWORD) {
    localStorage.setItem(LOCK_KEY, 'true');
    lockModal?.classList.remove('show');
    lockModal?.setAttribute('aria-hidden', 'true');
    if (lockError) lockError.textContent = '';
  } else {
    if (lockError) lockError.textContent = 'Неверный пароль';
  }
});
maybeShowLock();

$$('[data-scroll]').forEach(btn => {
  btn.addEventListener('click', e => {
    const id = btn.getAttribute('data-scroll');
    const el = typeof id === 'string' ? document.querySelector(id) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

$('#year').textContent = new Date().getFullYear();

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
$$('.reveal').forEach(el => io.observe(el));

const heroImg = $('#heroParallax');
let latestScrollY = 0;
let ticking = false;
function onScroll(){
  latestScrollY = window.scrollY || window.pageYOffset;
  if (!ticking){
    window.requestAnimationFrame(() => {
      const offset = Math.min(40, latestScrollY * 0.12);
      if (heroImg){
        heroImg.style.transform = `translateY(${offset}px) scale(1.08)`;
      }
      ticking = false;
    });
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });

function bindTilt(el){
  const strength = 10;
  let rect;
  function onMove(e){
    rect ||= el.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const dx = (e.clientX - cx) / (rect.width/2);
    const dy = (e.clientY - cy) / (rect.height/2);
    const rx = (+dy * strength).toFixed(2);
    const ry = (-dx * strength).toFixed(2);
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }
  function onLeave(){
    el.style.transform = '';
    rect = undefined;
  }
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);
}
$$('.card').forEach(bindTilt);

const modal = $('#authModal');
const openAuth = $('#openAuth');
const openAuthHero = $('#openAuthHero');
const closeEls = $$('[data-close]');
const tabs = $$('.tab', modal);
const panels = $$('.panel', modal);

function openModal(tab = 'login'){
  setActiveTab(tab);
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function setActiveTab(name){
  tabs.forEach(t => {
    const isActive = t.dataset.tab === name;
    t.classList.toggle('is-active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  panels.forEach(p => {
    const isActive = p.dataset.panel === name;
    p.classList.toggle('is-active', isActive);
    p.style.display = isActive ? 'grid' : 'none';
  });
}

openAuth?.addEventListener('click', () => openModal('login'));
openAuthHero?.addEventListener('click', () => openModal('login'));
closeEls.forEach(el => el.addEventListener('click', closeModal));
tabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.tab)));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const LS_KEY_USERS = 'p911_users';
const LS_KEY_SESSION = 'p911_session';

function readUsers(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY_USERS)) || []; }
  catch{ return []; }
}
function writeUsers(list){ localStorage.setItem(LS_KEY_USERS, JSON.stringify(list)); }
function setSession(email){ localStorage.setItem(LS_KEY_SESSION, email); }
function getSession(){ return localStorage.getItem(LS_KEY_SESSION); }
function clearSession(){ localStorage.removeItem(LS_KEY_SESSION); }

const loginForm = $('#loginForm');
const registerForm = $('#registerForm');
const loginError = $('#loginError');
const registerError = $('#registerError');

registerForm?.addEventListener('submit', e => {
  e.preventDefault();
  registerError.textContent = '';
  const data = new FormData(registerForm);
  const name = (data.get('name')||'').toString().trim();
  const email = (data.get('email')||'').toString().trim().toLowerCase();
  const password = (data.get('password')||'').toString();
  if (!name || !email || password.length < 6){
    registerError.textContent = 'Заполните все поля. Пароль минимум 6 символов.';
    return;
  }
  const users = readUsers();
  if (users.some(u => u.email === email)){
    registerError.textContent = 'Пользователь с таким email уже существует.';
    return;
  }
  users.push({ name, email, password });
  writeUsers(users);
  setSession(email);
  updateUserState();
  closeModal();
});

loginForm?.addEventListener('submit', e => {
  e.preventDefault();
  loginError.textContent = '';
  const data = new FormData(loginForm);
  const email = (data.get('email')||'').toString().trim().toLowerCase();
  const password = (data.get('password')||'').toString();
  const users = readUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user){
    loginError.textContent = 'Неверный email или пароль.';
    return;
  }
  setSession(email);
  updateUserState();
  closeModal();
});

const userMenu = $('#userMenu');
const userChip = $('#userChip');
const userName = $('#userName');
const userInitials = $('#userInitials');
const logoutBtn = $('#logoutBtn');

function updateUserState(){
  const sessionEmail = getSession();
  if (sessionEmail){
    const user = readUsers().find(u => u.email === sessionEmail);
    if (user){
      userMenu.hidden = false;
      const navAuthBtn = $('#openAuth');
      const heroAuthBtn = $('#openAuthHero');
      if (navAuthBtn) navAuthBtn.style.display = 'none';
      if (heroAuthBtn) heroAuthBtn.style.display = 'none';
      userName.textContent = user.name;
      userInitials.textContent = user.name.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
      return;
    }
  }
  userMenu.hidden = true;
  const navAuthBtn = $('#openAuth');
  const heroAuthBtn = $('#openAuthHero');
  if (navAuthBtn) navAuthBtn.style.display = '';
  if (heroAuthBtn) heroAuthBtn.style.display = '';
}

userChip?.addEventListener('click', () => {
  const menu = $('.user__menu', userMenu);
  const isOpen = menu.classList.toggle('show');
  userChip.setAttribute('aria-expanded', String(isOpen));
});
document.addEventListener('click', e => {
  const menu = $('.user__menu', userMenu);
  if (!menu) return;
  if (!userMenu.contains(e.target)) menu.classList.remove('show');
});
logoutBtn?.addEventListener('click', () => {
  clearSession();
  updateUserState();
});

$('#ctaTest')?.addEventListener('click', () => {
  if (!getSession()) openModal('register');
  else showToast('Спасибо! Ваша заявка принята. Мы свяжемся с вами.');
});

updateUserState();

function showToast(message){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2400);
}


