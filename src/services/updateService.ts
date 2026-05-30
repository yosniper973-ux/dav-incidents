import { UPDATE_CHECK_URL } from '../update.config';

export interface RemoteVersion {
  version: string;
  notes?: string;
  apkUrl?: string;
}

function parseVer(v: string): number[] {
  return v.split('.').map(n => parseInt(n, 10) || 0);
}

function isNewer(remote: string, local: string): boolean {
  const r = parseVer(remote);
  const l = parseVer(local);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true;
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false;
  }
  return false;
}

export async function checkForUpdate(appVersion: string): Promise<RemoteVersion | null> {
  if (!UPDATE_CHECK_URL) return null;
  try {
    const res = await fetch(UPDATE_CHECK_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: RemoteVersion = await res.json();
    if (!data.version) return null;
    return isNewer(data.version, appVersion) ? data : null;
  } catch {
    return null;
  }
}
