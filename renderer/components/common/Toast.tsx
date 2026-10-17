import { Check, CircleAlert, X } from "lucide-react";
import { IconButton } from "./IconButton";

interface ToastProps {
  kind: "success" | "error" | "info";
  message: string;
  onDismiss(): void;
}

export function Toast({ kind, message, onDismiss }: ToastProps) {
  const Icon = kind === "success" ? Check : kind === "error" ? CircleAlert : Check;
  return <div className={`toast toast-${kind}`} role="status">
    <Icon size={16} /><span>{message}</span><IconButton label="Dismiss" onClick={onDismiss}><X size={14} /></IconButton>
  </div>;
}
