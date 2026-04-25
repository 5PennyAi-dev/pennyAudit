import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Largeur max en classes Tailwind. Défaut max-w-md. */
  maxWidth?: string;
}

export function Modal({ open, onClose, title, description, children, maxWidth = 'max-w-md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC ferme la modal
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus auto sur le contenu de la modal à l'ouverture
  useEffect(() => {
    if (open) {
      const ta = dialogRef.current?.querySelector<HTMLElement>('textarea, input, button');
      ta?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      {/* Backdrop */}
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full rounded-2xl bg-paper border border-line shadow-(--shadow-card-hover) p-6',
          maxWidth,
        )}
      >
        <header className="mb-4">
          <h3 id="modal-title" className="text-lg font-bold text-navy-600">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}

export default Modal;
