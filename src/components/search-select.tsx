"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string; hint?: string };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matches(option: SearchOption, query: string) {
  const q = normalize(query);
  if (!q) return true;
  return normalize(option.label).includes(q) || normalize(option.hint ?? "").includes(q);
}

export function SearchSelect({
  name,
  options,
  placeholder = "Buscar...",
  emptyOption,
  required,
  value,
  defaultValue,
  onChange,
  className,
}: {
  name?: string;
  options: SearchOption[];
  placeholder?: string;
  emptyOption?: { value: string; label: string };
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [inner, setInner] = useState(defaultValue ?? value ?? "");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(0);

  const selectedId = value !== undefined ? value : inner;
  const allOptions = useMemo(() => {
    if (!emptyOption) return options;
    return [{ value: emptyOption.value, label: emptyOption.label }, ...options.filter((o) => o.value !== emptyOption.value)];
  }, [emptyOption, options]);
  const selected = allOptions.find((o) => o.value === selectedId);
  const filtered = useMemo(() => allOptions.filter((o) => matches(o, query)), [allOptions, query]);
  const highlighted = Math.min(active, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !selectedId ? "Selecione uma opção da lista." : "");
  }, [required, selectedId]);

  useEffect(() => {
    if (!open || !inputRef.current) return;
    function update() {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function commit(next: string) {
    if (value === undefined) setInner(next);
    onChange?.(next);
    setQuery(allOptions.find((o) => o.value === next)?.label ?? "");
    setOpen(false);
  }

  function onInput(next: string) {
    setQuery(next);
    setOpen(true);
    setActive(0);
    if (selected && next !== selected.label) {
      if (value === undefined) setInner("");
      onChange?.("");
    }
  }

  const listStyle = (() => {
    if (!rect || typeof window === "undefined") return undefined;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(280, Math.max(120, (flip ? spaceAbove : spaceBelow) - 8));
    return {
      top: flip ? rect.top - 4 - maxHeight : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight,
    };
  })();

  const list =
    open && rect && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            style={listStyle}
            className="fixed z-[80] overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-xl"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">Nenhum resultado</li>
            ) : (
              filtered.map((option, index) => {
                const isActive = index === highlighted;
                const isSelected = option.value === selectedId;
                return (
                  <li key={`${option.value}-${option.label}`} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                        isActive ? "bg-sand" : "hover:bg-sand",
                      )}
                      onMouseEnter={() => setActive(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(option.value)}
                    >
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        {option.hint ? <span className="block text-xs text-ink-soft">{option.hint}</span> : null}
                      </span>
                      {isSelected ? <Check size={14} className="shrink-0 text-wine" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={selectedId} readOnly /> : null}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={open ? query : (selected?.label ?? "")}
          className="h-11 w-full rounded-lg border border-line bg-paper py-0 pr-9 pl-3 text-sm outline-none ring-wine/20 focus:ring-2"
          onFocus={(e) => {
            setQuery(selected?.label ?? "");
            setActive(0);
            setOpen(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive(highlighted + 1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(Math.max(highlighted - 1, 0));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              const option = filtered[highlighted];
              if (option) commit(option.value);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <ChevronsUpDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-soft" />
      </div>
      {list}
    </div>
  );
}
