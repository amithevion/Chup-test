import { supabase, isConfigured } from './db.js';

const MAX_GUESTS = 12;

const form = document.getElementById('rsvp-form');
const nameInput = document.getElementById('full-name');
const countSelect = document.getElementById('guest-count');
const errorEl = document.getElementById('form-error');
const submitBtn = form.querySelector('button[type="submit"]');
const thanks = document.getElementById('thanks');

for (let i = 1; i <= MAX_GUESTS; i++) {
  countSelect.add(new Option(i === 1 ? 'אורח/ת אחד/ת' : `${i} אורחים`, i));
}
countSelect.value = '2';

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const fullName = nameInput.value.trim().replace(/\s+/g, ' ');
  const guestCount = Number(countSelect.value);

  if (fullName.length < 2) {
    showError('נא להזין שם מלא');
    nameInput.focus();
    return;
  }
  if (!isConfigured) {
    showError('המערכת עדיין לא הוגדרה (חסרים פרטי Supabase ב-js/config.js)');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'שולח…';

  const { error } = await supabase
    .from('rsvps')
    .insert({ full_name: fullName, guest_count: guestCount });

  if (error) {
    console.error(error);
    showError('משהו השתבש, נסו שוב בעוד רגע');
    submitBtn.disabled = false;
    submitBtn.textContent = 'אישור הגעה';
    return;
  }

  document.getElementById('thanks-name').textContent = fullName;
  document.getElementById('thanks-text').textContent =
    guestCount === 1 ? 'אישרת הגעה של אורח/ת אחד/ת. נתראה!' : `אישרתם הגעה של ${guestCount} אורחים. נתראה!`;
  form.hidden = true;
  thanks.hidden = false;
  thanks.focus();
});
