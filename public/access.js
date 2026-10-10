const unlockForm = document.getElementById('unlock-form');
const unlockButton = document.getElementById('unlock-button');
const accessMessage = document.getElementById('access-message');
const accessInput = document.getElementById('access-key');

if (new URLSearchParams(window.location.hash.slice(1)).has('invite_token')) {
  window.location.replace('/owner.html' + window.location.hash);
}

unlockForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  unlockButton.disabled = true;
  unlockButton.textContent = 'KEY CHECK HO RAHI HAI…';
  accessMessage.textContent = '';
  try {
    const result = await fetch('/api/access/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: accessInput.value }),
      signal: AbortSignal.timeout(20000),
    });
    const state = await result.json();
    accessInput.value = '';
    if (!result.ok || !state.unlocked) throw new Error(state.error || 'Access unavailable. Dobara try karein.');
    window.location.replace('/dashboard');
  } catch (error) {
    accessInput.value = '';
    accessMessage.textContent = error.name === 'TimeoutError' || error instanceof TypeError
      ? 'Connection nahi ho paaya. Thodi der baad try karein.' : error.message;
    unlockButton.disabled = false;
    unlockButton.textContent = 'UNLOCK DASHBOARD →';
    accessInput.focus();
  }
});

window.addEventListener('pageshow', () => { accessInput.value = ''; });
