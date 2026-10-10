const ownerLogin = document.getElementById('owner-login');
const ownerControls = document.getElementById('owner-controls');
const ownerMessage = document.getElementById('owner-message');
const ownerPassword = document.getElementById('owner-password');
const ownerEmail = document.getElementById('owner-email');
const invitation = new URLSearchParams(window.location.hash.slice(1)).get('invite_token');
history.replaceState(null, '', window.location.pathname);

if (invitation) {
  document.getElementById('email-field').hidden = true;
  ownerEmail.required = false;
  ownerPassword.autocomplete = 'new-password';
  document.getElementById('password-label').textContent = 'Choose your owner password';
  document.getElementById('login-button').textContent = 'ACCEPT OWNER INVITATION →';
}

async function ownerRequest(path, body) {
  const result = await fetch('/api/owner/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const state = await result.json();
  if (!result.ok) {
    if (result.status === 403 && path !== 'login' && path !== 'invite') {
      ownerControls.hidden = true;
      ownerLogin.hidden = false;
    }
    throw new Error(state.error || 'Service unavailable. Try again later.');
  }
  return state;
}

async function refreshOwner() {
  const state = await ownerRequest('status');
  ownerLogin.hidden = true;
  ownerControls.hidden = false;
  document.getElementById('key-status').textContent = state.configured
    ? 'Access is enabled. Only visitors with the current key can open the dashboard.'
    : 'Access is disabled. Set a key to let your visitors in.';
}

function showOwnerError(error) {
  ownerMessage.textContent = error.name === 'TimeoutError' || error instanceof TypeError
    ? 'Unable to connect. Please try again later.' : error.message;
}

async function runOwnerAction(button, action) {
  button.disabled = true;
  ownerMessage.textContent = '';
  try { await action(); } catch (error) { showOwnerError(error); }
  finally { button.disabled = false; }
}

document.getElementById('owner-login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runOwnerAction(event.submitter, async () => {
    const credentials = invitation
      ? { token: invitation, password: ownerPassword.value }
      : { email: ownerEmail.value, password: ownerPassword.value };
    ownerPassword.value = '';
    await ownerRequest(invitation ? 'invite' : 'login', credentials);
    window.location.replace('/owner.html');
  });
});

document.getElementById('key-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runOwnerAction(event.submitter, async () => {
    const keyInput = document.getElementById('new-key');
    const key = keyInput.value;
    keyInput.value = '';
    await ownerRequest('key', { key });
    event.target.reset();
    await refreshOwner();
    ownerMessage.textContent = 'Key saved. Old keys and sessions no longer work. Share the new key privately.';
  });
});

document.getElementById('revoke-form').addEventListener('submit', (event) => {
  event.preventDefault();
  runOwnerAction(event.submitter, async () => {
    await ownerRequest('revoke', {});
    event.target.reset();
    await refreshOwner();
    ownerMessage.textContent = 'All dashboard access is now disabled.';
  });
});

document.getElementById('owner-signout').addEventListener('click', (event) => {
  runOwnerAction(event.target, async () => {
    await ownerRequest('logout', {});
    window.location.replace('/owner.html');
  });
});

if (!invitation) refreshOwner().catch((error) => {
  if (error.message !== 'Owner login required.') showOwnerError(error);
});
