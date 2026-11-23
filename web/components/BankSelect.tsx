"use client";

import { useMemo, useRef, useState } from "react";
import { BANKS, bankByCode } from "@/lib/banks";

interface Props {
  id: string;
  value: string; // bank code
  onChange: (code: string) => void;
  disabled?: boolean;
}

// Searchable bank picker: a combobox with a filter input and listbox. The
// native <select> it replaces only allowed six hardcoded options.
export function BankSelect({ id, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = bankByCode(value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BANKS;
    return BANKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.includes(q)
    );
  }, [query]);

  function pick(code: string) {
    onChange(code);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active].code);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        className="input"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={selected ? selected.name : "Search banks…"}
        value={open ? query : (selected?.name ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-ink-900 shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              No banks match “{query}”.
            </li>
          )}
          {filtered.map((b, i) => (
            <li key={b.code} role="option" aria-selected={b.code === value}>
              <button
                type="button"
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-800 ${
                  i === active ? "bg-slate-800" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(b.code);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{b.name}</span>
                <span className="font-mono text-xs text-slate-500">
                  {b.code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
