import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface Props<T extends string> {
    id?: string; label: string; value: T; options: { value: T; label: string }[];
    onChange: (value: T) => void; disabled?: boolean; className?: string; icon?: ReactNode;
}

export function SelectControl<T extends string>({ id, label, value, options, onChange, disabled, className = "", icon }: Props<T>) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const listId = `${controlId}-options`;
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [above, setAbove] = useState(false);
    const [maxHeight, setMaxHeight] = useState(320);
    const container = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const selectedIndex = options.findIndex((option) => option.value === value);

    useEffect(() => {
        if (!open) return;
        function outside(event: PointerEvent) {
            if (!container.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("pointerdown", outside);
        const resize = () => setOpen(false);
        window.addEventListener("resize", resize);
        return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); };
    }, [open]);

    function show() {
        if (disabled) return;
        const rect = trigger.current?.getBoundingClientRect();
        const below = rect ? window.innerHeight - rect.bottom : 320;
        const up = rect?.top ?? 0;
        const flip = below < options.length * 42 + 14 && up > below;
        setAbove(flip);
        setMaxHeight(Math.max(60, Math.min(320, (flip ? up : below) - 16)));
        setActive(Math.max(0, selectedIndex)); setOpen(true);
    }
    function choose(index: number) { onChange(options[index].value); setOpen(false); trigger.current?.focus(); }
    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (disabled) return;
        if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (event.key === "Tab") { setOpen(false); return; }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); if (open) choose(active); else show(); return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) {
                show();
                if (event.key === "Home") setActive(0);
                if (event.key === "End") setActive(options.length - 1);
            } else {
                setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
                    : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
            }
        } else if (open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const next = options.map((_, offset) => (active + offset + 1) % options.length)
                .find((index) => options[index].label.toLowerCase().startsWith(event.key.toLowerCase()));
            if (next !== undefined) { event.preventDefault(); setActive(next); }
        }
    }

    return <div ref={container} className={`select-control ${className}`} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
        <button ref={trigger} id={controlId} type="button" className="select-trigger" role="combobox" aria-label={label}
            aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
            aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled} onKeyDown={onKeyDown}
            onClick={() => { if (open) setOpen(false); else show(); }}>
            {icon}<span className="select-value">{options[selectedIndex]?.label ?? "Not selected"}</span>
            <svg className="select-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
        </button>
        {open && <div id={listId} className="select-menu" data-placement={above ? "above" : "below"} style={{ maxHeight }} role="listbox" aria-label={label}>
            {options.map((option, index) => <button key={option.value} id={`${listId}-${index}`} type="button" role="option"
                aria-selected={option.value === value} data-active={active === index} tabIndex={-1}
                onPointerMove={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}>
                <span>{option.label}</span><span aria-hidden="true">{option.value === value ? "✓" : ""}</span>
            </button>)}
        </div>}
    </div>;
}
