export function isPermissionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = "code" in error ? error.code : undefined;
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
  return code === "EACCES" || code === "EPERM" || /permission denied|operation not permitted/i.test(stderr);
}

export function permissionError(error: unknown, target: string): unknown {
  if (!isPermissionError(error)) return error;
  if (typeof error === "object" && error !== null && "code" in error) return error;
  return Object.assign(new Error(`Permission denied while reading ${target}`), { code: "EACCES" });
}
