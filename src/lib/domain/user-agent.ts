// Best-effort, dependency-free parsing of a User-Agent string into a friendly
// device/browser label for the active-sessions list. Not exhaustive — just
// enough to give users a recognizable description of each session.

export interface UserAgentInfo {
  browser: string;
  os: string;
  deviceLabel: string;
}

export function describeUserAgent(ua: string | null | undefined): UserAgentInfo {
  if (!ua) return { browser: "Unknown browser", os: "Unknown OS", deviceLabel: "Unknown device" };

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";

  const os = /Windows NT 10/.test(ua)
    ? "Windows"
    : /Windows/.test(ua)
      ? "Windows"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Android/.test(ua)
          ? "Android"
          : /iPhone|iPad|iOS/.test(ua)
            ? "iOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Unknown OS";

  return { browser, os, deviceLabel: `${browser} on ${os}` };
}
