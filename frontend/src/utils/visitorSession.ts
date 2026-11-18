export interface VisitorSession {
  clientId: string;
  clientAlias: string;
  deviceInfo: string;
  firstVisit: string;
}

const STORAGE_KEY = 'flexivor_truper_visitor_session_v1';

export function getOrCreateVisitorSession(): VisitorSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.clientId && parsed.clientAlias) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read visitor session from localStorage:', e);
  }

  // Friendly 4-digit code e.g. Visitante #4819
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const randomHex = Math.random().toString(36).substring(2, 7);

  // Device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
  const deviceType = isMobile ? 'Móvil' : 'Escritorio';

  const newSession: VisitorSession = {
    clientId: `cli_${randomHex}`,
    clientAlias: `Visitante #${randomNum}`,
    deviceInfo: deviceType,
    firstVisit: new Date().toISOString()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
  } catch (e) {
    console.warn('Could not save visitor session to localStorage:', e);
  }

  return newSession;
}

export function resetVisitorSession(): VisitorSession {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Could not reset visitor session:', e);
  }
  return getOrCreateVisitorSession();
}
