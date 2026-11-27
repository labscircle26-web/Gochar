import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { searchCities, type City } from "@/lib/astro/cities";

export type PlaceValue = {
  label: string;
  lat: number;
  lon: number;
  tz: string;
};

const fieldClass = "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink";

export function PlaceFields({
  place,
  onChange,
  idPrefix,
}: {
  place: PlaceValue;
  onChange: (place: PlaceValue) => void;
  idPrefix: string;
}) {
  const [query, setQuery] = useState(place.label);
  const [open, setOpen] = useState(false);
  const [geoNote, setGeoNote] = useState("");
  useEffect(() => setQuery(place.label), [place.label]);
  const matches = useMemo(() => searchCities(query), [query]);
  const zones = useMemo(() => {
    const supported = Intl.supportedValuesOf?.("timeZone") ?? [];
    return supported.length > 0 ? supported : [place.tz];
  }, [place.tz]);

  function choose(city: City) {
    const next = {
      label: `${city.name}, ${city.region}`,
      lat: city.lat,
      lon: city.lon,
      tz: city.tz,
    };
    onChange(next);
    setQuery(next.label);
    setOpen(false);
    setGeoNote("");
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoNote("This browser cannot share a location.");
      return;
    }
    setGeoNote("Asking for location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const next = {
          label: "This device",
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
          tz,
        };
        onChange(next);
        setQuery(next.label);
        setGeoNote("Using this device’s coordinates and time zone.");
      },
      () => setGeoNote("Location was blocked. Search a city instead."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,1.1fr)]">
        <div className="relative">
          <label htmlFor={`${idPrefix}-place`} className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
            <MapPin className="size-3.5" aria-hidden="true" />
            Place
          </label>
          <input
            id={`${idPrefix}-place`}
            className={fieldClass}
            value={query}
            placeholder="Search a city"
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-line bg-card shadow-sm">
              {matches.map((city) => (
                <li key={`${city.name}-${city.region}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm hover:bg-paper-2"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(city)}
                  >
                    <span>
                      {city.name}
                      <span className="text-muted"> · {city.region}</span>
                    </span>
                    <span className="text-xs text-muted">{city.tz.split("/")[1]?.replaceAll("_", " ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Latitude
          <input
            className={`${fieldClass} tabular-nums`}
            inputMode="decimal"
            value={Number.isFinite(place.lat) ? String(place.lat) : ""}
            onChange={(event) => {
              const lat = Number(event.target.value);
              if (Number.isFinite(lat)) onChange({ ...place, lat, label: "Custom place" });
            }}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Longitude
          <input
            className={`${fieldClass} tabular-nums`}
            inputMode="decimal"
            value={Number.isFinite(place.lon) ? String(place.lon) : ""}
            onChange={(event) => {
              const lon = Number(event.target.value);
              if (Number.isFinite(lon)) onChange({ ...place, lon, label: "Custom place" });
            }}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Time zone
          <input
            className={fieldClass}
            list={`${idPrefix}-zones`}
            value={place.tz}
            onChange={(event) => onChange({ ...place, tz: event.target.value })}
          />
          <datalist id={`${idPrefix}-zones`}>
            {zones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={locate} className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-medium text-ink hover:bg-paper-2">
          <LocateFixed className="size-4" aria-hidden="true" />
          Use this device
        </button>
        {geoNote && <p className="text-sm text-muted">{geoNote}</p>}
      </div>
    </div>
  );
}
