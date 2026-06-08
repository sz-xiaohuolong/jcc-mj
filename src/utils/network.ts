interface LocationLike {
  hostname: string;
  protocol: string;
}

export function resolveOnlineServerUrl(envUrl: string | undefined, location: LocationLike): string {
  if (envUrl?.trim()) {
    return envUrl.trim();
  }

  const protocol = location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${location.hostname}:8787`;
}
