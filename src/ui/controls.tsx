import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: 'primary' | 'quiet';
};

export function Button({ icon, variant, children, className = '', ...props }: ButtonProps) {
  return (
    <button type="button" {...props} className={`button ${variant ?? ''} ${className}`}>
      {icon}
      {children}
    </button>
  );
}

type DialogProps = { title: string; onClose: () => void; children: ReactNode };

export function Dialog({ title, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  return (
    <dialog ref={dialog} className="dialog" aria-label={title} onCancel={onClose}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <Button variant="quiet" aria-label="关闭" onClick={onClose} icon={<X size={18} />} />
      </div>
      {children}
    </dialog>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
