import { execFile as callbackExecFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(callbackExecFile);

export async function isAppRunning(appPath: string): Promise<boolean> {
  return (await runningProcessIds(appPath)).length > 0;
}

export async function quitApp(appPath: string): Promise<void> {
  for (const pid of await runningProcessIds(appPath)) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if (errorCode(error) !== "ESRCH") throw error;
    }
  }
}

async function runningProcessIds(appPath: string): Promise<number[]> {
  const escaped = appPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const { stdout } = await execFile("/usr/bin/pgrep", ["-f", `^${escaped}/Contents/MacOS/`], { timeout: 2500 });
    return stdout.split(/\s+/).filter(Boolean).map(Number).filter(Number.isInteger);
  } catch (error) {
    if (errorCode(error) === 1) return [];
    throw error;
  }
}

function errorCode(error: unknown): string | number | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return error.code as string | number;
}
