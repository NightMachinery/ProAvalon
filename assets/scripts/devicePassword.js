(function attachDevicePasswordHelpers(global) {
  const LAST_USERNAME_KEY = 'proavalon.quickAuth.lastUsername';
  const RECORD_PREFIX = 'proavalon.quickAuth.';

  function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  function getRecordKey(username) {
    return RECORD_PREFIX + normalizeUsername(username);
  }

  function saveQuickAuth(username, password) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername || !password) {
      return;
    }

    const record = {
      username: String(username).trim(),
      password,
      updatedAt: new Date().toISOString(),
    };

    global.localStorage.setItem(getRecordKey(normalizedUsername), JSON.stringify(record));
    global.localStorage.setItem(LAST_USERNAME_KEY, normalizedUsername);
  }

  function getQuickAuth(username) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return null;
    }

    const rawValue = global.localStorage.getItem(getRecordKey(normalizedUsername));

    if (!rawValue) {
      return null;
    }

    try {
      const record = JSON.parse(rawValue);

      if (!record || !record.username || !record.password) {
        return null;
      }

      return record;
    } catch (error) {
      return null;
    }
  }

  function getLastQuickAuth() {
    const lastUsername = normalizeUsername(
      global.localStorage.getItem(LAST_USERNAME_KEY),
    );

    if (!lastUsername) {
      return null;
    }

    return getQuickAuth(lastUsername);
  }

  function forgetQuickAuth(username) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return;
    }

    global.localStorage.removeItem(getRecordKey(normalizedUsername));

    if (normalizeUsername(global.localStorage.getItem(LAST_USERNAME_KEY)) === normalizedUsername) {
      global.localStorage.removeItem(LAST_USERNAME_KEY);
    }
  }

  function copyTextHttpSafe(text) {
    if (!text) {
      return false;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'readonly');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let copied = false;

    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(textArea);
    return copied;
  }

  global.ProAvalonDevicePassword = {
    copyTextHttpSafe,
    forgetQuickAuth,
    getLastQuickAuth,
    getQuickAuth,
    normalizeUsername,
    saveQuickAuth,
  };
})(window);
