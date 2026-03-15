"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { MunicipioIGAC } from "@/types";

interface SearchBarProps {
  municipios: MunicipioIGAC[];
  onSelect: (codigo: string) => void;
}

export default function SearchBar({ municipios, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return municipios
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.departamento.toLowerCase().includes(q) ||
          m.codigo.includes(q)
      )
      .slice(0, 8);
  }, [query, municipios]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar municipio..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="bg-transparent text-white text-sm outline-none w-full placeholder:text-gray-500"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {results.map((m) => (
            <button
              key={m.codigo}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm transition-colors"
              onMouseDown={() => {
                onSelect(m.codigo);
                setQuery(m.nombre);
                setOpen(false);
              }}
            >
              <span className="text-white">{m.nombre}</span>
              <span className="text-gray-500 ml-2">{m.departamento}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
