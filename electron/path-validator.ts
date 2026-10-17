import path from "node:path";

export interface PathStat {
  isSymbolicLink(): boolean;
}

export interface PathFileSystem {
  lstat(path: string): Promise<PathStat>;
  realpath(path: string): Promise<string>;
}

export async function validateTarget(
  target: string,
  allowedRoots: string[],
  protectedPaths: string[],
  io: PathFileSystem
): Promise<string> {
  if (!target || target.includes("\0") || !path.isAbsolute(target)) throw new Error("Target must be an absolute path.");
  if (target.split(path.sep).includes("..")) throw new Error("Parent traversal is not allowed.");
  const resolved = path.resolve(target);
  const root = allowedRoots.find((candidate) => isWithin(resolved, path.resolve(candidate)));
  if (!root || resolved === path.resolve(root)) throw new Error("Target is outside an allowed location.");
  if (protectedPaths.some((item) => resolved === path.resolve(item) || isWithin(resolved, path.resolve(item)))) {
    throw new Error("Protected locations cannot be changed.");
  }

  const canonicalRoot = await io.realpath(root);
  if (canonicalRoot !== path.resolve(root)) throw new Error("Allowed location resolves through a symlink.");
  const canonicalTarget = await io.realpath(resolved);
  if (!isWithin(canonicalTarget, canonicalRoot) || canonicalTarget === canonicalRoot) {
    throw new Error("Target resolves outside its allowed location.");
  }

  let current = path.resolve(root);
  for (const part of path.relative(current, resolved).split(path.sep)) {
    current = path.join(current, part);
    if ((await io.lstat(current)).isSymbolicLink()) throw new Error("Symlink paths cannot be changed.");
  }
  return canonicalTarget;
}

function isWithin(target: string, root: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
