import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "../../shared/components/scrollLock";

interface Photo { id: string; url: string; alt: string }
interface Props { photos: Photo[]; selectedId: string; onSelect: (id: string) => void; onClose: () => void }

export function PhotoViewer({ photos, selectedId, onSelect, onClose }: Props) {
    const container = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const index = photos.findIndex((photo) => photo.id === selectedId);
    const selected = photos[index];

    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        const unlockScroll = lockBodyScroll();
        closeButton.current?.focus();
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
            if (event.key !== "Tab") return;
            event.stopPropagation();
            const buttons = Array.from(container.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
            const first = buttons[0];
            const last = buttons.at(-1);
            const outside = !container.current?.contains(document.activeElement);
            if (event.shiftKey && (document.activeElement === first || outside)) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && (document.activeElement === last || outside)) {
                event.preventDefault(); first?.focus();
            }
        }
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            unlockScroll();
            if (opener?.isConnected) opener.focus();
        };
    }, [onClose]);

    if (!selected) return null;
    return createPortal(<div ref={container} className="photo-viewer-overlay" role="dialog" aria-modal="true" aria-label="Photo viewer"
        onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
        <button ref={closeButton} type="button" className="photo-viewer-close" aria-label="Close photo" onClick={onClose}>×</button>
        {photos.length > 1 && <button type="button" className="photo-viewer-nav photo-viewer-nav-left" aria-label="Previous photo"
            onClick={() => onSelect(photos[(index + photos.length - 1) % photos.length].id)}>‹</button>}
        <img src={selected.url} alt={selected.alt} className="photo-viewer-image" />
        {photos.length > 1 && <button type="button" className="photo-viewer-nav photo-viewer-nav-right" aria-label="Next photo"
            onClick={() => onSelect(photos[(index + 1) % photos.length].id)}>›</button>}
        <div className="photo-viewer-counter" aria-live="polite">{index + 1} / {photos.length}</div>
    </div>, document.body);
}
