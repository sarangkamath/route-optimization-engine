import { useState } from "react";
import type { FormEvent } from "react";
import { searchPlaces } from "../services/api";
import type { PlaceResult } from "../services/api";

interface Props {
  disabled: boolean;
  full: boolean;
  onPick: (place: PlaceResult) => void;
}

export default function SearchBox({ disabled, full, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await searchPlaces(q));
    } catch (err) {
      setResults(null);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  function pick(place: PlaceResult) {
    onPick(place);
    setQuery("");
    setResults(null);
  }

  return (
    <section className="search">
      <form onSubmit={search}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults(null);
          }}
          onKeyDown={(e) => e.key === "Escape" && setResults(null)}
          placeholder={full ? "Maximum of 10 stops reached" : "Search an address or place"}
          disabled={disabled || full}
          aria-label="Search for a location"
        />
        <button type="submit" disabled={disabled || full || busy || !query.trim()}>
          {busy ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="search-note search-note--error">{error}</p>}

      {results && (
        <ul className="results">
          {results.length === 0 && <li className="search-note">No places found. Try adding the city.</li>}
          {results.map((r, i) => (
            <li key={`${r.latitude},${r.longitude},${i}`}>
              <button onClick={() => pick(r)}>
                <span className="result-label">{r.label}</span>
                <span className="result-detail">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
