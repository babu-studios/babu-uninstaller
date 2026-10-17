import { ShieldAlert } from "lucide-react";

interface FullDiskAccessNoticeProps {
  onOpenSettings(): void;
  onRescan(): void;
}

export function FullDiskAccessNotice({ onOpenSettings, onRescan }: FullDiskAccessNoticeProps) {
  return <aside className="permission-notice">
    <ShieldAlert size={17} /><div><strong>Some locations couldn't be read</strong>
      <span>Open Privacy &amp; Security → Full Disk Access, enable Babu App Uninstaller, then scan again. You can continue with available locations meanwhile.</span>
    </div><button onClick={onRescan}>Scan again</button><button onClick={onOpenSettings}>Open Privacy &amp; Security</button>
  </aside>;
}
