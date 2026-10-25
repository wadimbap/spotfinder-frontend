import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface Props { children: ReactNode; onClose: () => void; label?: string }

export function SpotDialog({ children, onClose, label = "Spot details" }: Props) {
    const container = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        container.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            previous?.focus();
        };
    }, []);

    return (
        <div className="spot-dialog-backdrop" onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <div ref={container} className="spot-dialog" role="dialog" aria-modal="true"
                aria-label={label} tabIndex={-1} onKeyDown={(event) => {
                    if (event.key === "Escape") { event.stopPropagation(); onClose(); }
                    if (event.key !== "Tab") return;
                    const elements = Array.from(container.current?.querySelectorAll<HTMLElement>(
                        'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
                    ) ?? []);
                    const first = elements[0];
                    const last = elements.at(-1);
                    if (!first) { event.preventDefault(); return; }
                    if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) {
                        event.preventDefault(); last?.focus();
                    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container.current)) {
                        event.preventDefault(); first.focus();
                    }
                }}>
                {children}
            </div>
        </div>
    );
}
