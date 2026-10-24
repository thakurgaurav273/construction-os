export interface DeviceDescription {
  /** e.g. "Chrome on macOS". */
  label: string;
  mobile: boolean;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Firefox\/|FxiOS/, 'Firefox'],
  [/Chrome\/|CriOS/, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

/** Readable name for a session's user agent. Order matters: Edge and Opera also claim to be Chrome and Safari. */
export function describeDevice(userAgent: string | null): DeviceDescription {
  if (!userAgent) return { label: 'Unknown device', mobile: false };
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const mobile = /Mobi|Android|iPhone|iPad/.test(userAgent);
  if (browser && system) return { label: `${browser} on ${system}`, mobile };
  return { label: browser ?? system ?? 'Unknown device', mobile };
}
