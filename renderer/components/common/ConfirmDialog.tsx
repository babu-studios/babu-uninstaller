import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onCancel(): void;
  onConfirm(): void;
  children?: ReactNode;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !props.busy) props.onCancel();
  }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-head"><h2 id="dialog-title">{props.title}</h2>
        <IconButton label="Close" onClick={props.onCancel}><X size={16} /></IconButton>
      </div>
      <p>{props.description}</p>{props.children}
      <div className="dialog-actions">
        <button className="secondary" onClick={props.onCancel} disabled={props.busy}>Cancel</button>
        <button className={props.danger ? "danger" : "primary"} onClick={props.onConfirm} disabled={props.busy}>
          {props.busy ? "Please wait…" : props.confirmLabel}
        </button>
      </div>
    </section>
  </div>;
}
