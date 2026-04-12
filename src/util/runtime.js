export function isSelfHostEnv() {
  return process.env.ENV === 'selfhost';
}

export function isProdEnv() {
  return process.env.ENV === 'prod';
}

export function normalizeRelativeRedirectPath(rawValue) {
  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();

  if (
    trimmed.length === 0 ||
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//')
  ) {
    return null;
  }

  return trimmed;
}

export function stashReturnTo(req, rawValue) {
  const nextPath = normalizeRelativeRedirectPath(rawValue);

  if (!nextPath) {
    return null;
  }

  req.session.returnTo = nextPath;
  return nextPath;
}

export function getSavedReturnTo(req) {
  if (!req || !req.session) {
    return null;
  }

  return normalizeRelativeRedirectPath(req.session.returnTo);
}

export function consumeReturnTo(req, fallback = '/lobby') {
  const savedReturnTo = getSavedReturnTo(req);

  if (req && req.session) {
    delete req.session.returnTo;
  }

  return savedReturnTo || fallback;
}
