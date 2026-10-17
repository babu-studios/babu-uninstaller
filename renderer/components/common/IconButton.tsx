import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  onClick(): void;
  children: ReactNode;
  disabled?: boolean;
}

export function IconButton({ label, onClick, children, disabled }: IconButtonProps) {
  return <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
    {children}
  </button>;
}
