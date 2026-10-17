import type { BabuBridge } from "../../shared/contracts";

declare global {
  interface Window {
    babu: BabuBridge & {
      getPathForFile(file: File): string;
      openDroppedApp(path: string): void;
    };
  }
}
