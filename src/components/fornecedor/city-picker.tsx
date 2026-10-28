"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { searchCities } from "@/lib/br-cities";
import { cn } from "@/lib/utils";

export function CitySearch({
  name,
  value,
  onChange,
  placeholder = "Buscar cidade",
}: {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(0);
  const options = useMemo(() => searchCities(query), [query]);
  const highlighted = Math.min(active, Math.max(options.length - 1, 0));

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
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  const listStyle = (() => {
    if (!rect || typeof window === "undefined") return undefined;
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = Math.min(280, Math.max(120, spaceBelow - 8));
    return { top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220), maxHeight };
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
            {query.trim().length < 2 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">Digite ao menos 2 letras.</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-soft">Nenhuma cidade encontrada.</li>
            ) : (
              options.map((option, index) => (
                <li key={option.value} role="option" aria-selected={option.value === value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm",
                      index === highlighted ? "bg-sand" : "hover:bg-sand",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commit(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={value || placeholder}
        value={open ? query : value}
        className="h-11 w-full rounded-lg border border-line bg-paper px-3 text-base outline-none ring-wine/20 focus:ring-2 md:text-sm"
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(highlighted + 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(highlighted - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            const option = options[highlighted];
            if (option) commit(option.value);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {list}
    </div>
  );
}

export function SalonCityField({ defaultValue }: { defaultValue?: string | null }) {
  const [city, setCity] = useState(defaultValue ?? "");
  return <CitySearch name="city" value={city} onChange={setCity} placeholder="Buscar cidade do salão" />;
}

export function CityMultiSelect({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  function add(city: string) {
    if (!city || values.includes(city)) return;
    onChange([...values, city]);
  }

  return (
    <div className="space-y-2">
      <CitySearch value="" onChange={add} placeholder="Buscar e adicionar cidade" />
      {values.length === 0 ? (
        <p className="text-xs text-ink-soft">Escolha as cidades que o salão precisa ter para ver seus produtos.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {values.map((city) => (
            <span key={city} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">
              {city}
              <button type="button" aria-label={`Remover ${city}`} onClick={() => onChange(values.filter((item) => item !== city))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
