import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { findPersonalTransitAlerts, type PersonalAlertOptions, type PersonalTransitAlert } from "@/lib/astro/personal-alerts";
import { GRAHA_NAME, type GrahaId } from "@/lib/astro/constants";
import { formatStamp } from "@/lib/astro/time";
import { loadActiveId, loadProfiles, type BirthProfile } from "@/lib/astro/library";

type AlertSettings = PersonalAlertOptions & { enabled: boolean };

type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

type NativeNotificationPermissionEvent = CustomEvent<{ granted: boolean }>;

declare global {
  interface Window {
    GocharNative?: {
      hasNotificationPermission: () => boolean;
      requestNotificationPermission: () => void;
      scheduleNotifications: (eventsJson: string) => void;
    };
  }
}

const STORAGE_PREFIX = "gochar-personal-alerts:";
const DAY = 86_400_000;
const MAX_BROWSER_TIMER = 2_147_000_000;
const GRAHAS: GrahaId[] = ["jupiter", "saturn", "rahu", "ketu"];
const DEFAULT_SETTINGS: AlertSettings = {
  enabled: false,
  houseChanges: true,
  natalContacts: true,
  dashaChanges: true,
  transitingGrahas: GRAHAS,
};

function readSettings(profileId: string): AlertSettings {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + profileId);
    if (!raw) return DEFAULT_SETTINGS;
    const value = JSON.parse(raw) as Partial<AlertSettings>;
    return {
      enabled: value.enabled === true,
      houseChanges: value.houseChanges !== false,
      natalContacts: value.natalContacts !== false,
      dashaChanges: value.dashaChanges !== false,
      transitingGrahas: Array.isArray(value.transitingGrahas)
        ? GRAHAS.filter((id) => value.transitingGrahas!.includes(id))
        : [...GRAHAS],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function makeDeliveryEvents(events: PersonalTransitAlert[], now: number) {
  return events.slice(0, 20).flatMap((event) => {
    const deliveries = [];
    const reminderAt = event.at - DAY;
    if (reminderAt > now + 60_000) {
      deliveries.push({
        id: `tomorrow-${event.id}`,
        at: reminderAt,
        title: `Tomorrow · ${event.title}`,
        body: event.detail,
      });
    }
    if (event.at > now + 60_000) {
      deliveries.push({
        id: `event-${event.id}`,
        at: event.at,
        title: event.title,
        body: event.detail,
      });
    }
    return deliveries;
  });
}

export function PersonalTransitAlerts() {
  const [profiles, setProfiles] = useState<BirthProfile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [events, setEvents] = useState<PersonalTransitAlert[]>([]);
  const [eventsReady, setEventsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const browserTimers = useRef<number[]>([]);

  useEffect(() => {
    const refresh = () => {
      if (window.GocharNative) {
        setPermission(window.GocharNative.hasNotificationPermission() ? "granted" : "default");
      } else if ("Notification" in window) {
        setPermission(Notification.permission);
      } else {
        setPermission("unsupported");
      }
    };
    const onNativePermission = (event: Event) => {
      const granted = (event as NativeNotificationPermissionEvent).detail?.granted === true;
      setPermission(granted ? "granted" : "denied");
    };
    refresh();
    window.addEventListener("gochar-notification-permission", onNativePermission);
    return () => window.removeEventListener("gochar-notification-permission", onNativePermission);
  }, []);

  const profile = profiles.find((item) => item.id === profileId) ?? null;

  useEffect(() => {
    const saved = loadProfiles();
    const active = loadActiveId();
    setProfiles(saved);
    setProfileId(active && saved.some((item) => item.id === active) ? active : saved[0]?.id ?? null);
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (!profileId) {
      setSettings(DEFAULT_SETTINGS);
      setSettingsReady(true);
      setEvents([]);
      setEventsReady(true);
      return;
    }
    setSettingsReady(false);
    setEventsReady(false);
    setSettings(readSettings(profileId));
    setSettingsReady(true);
  }, [profileId]);

  useEffect(() => {
    if (!profileId || !settingsReady) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + profileId, JSON.stringify(settings));
    } catch {
      setError("These alert settings could not be saved on this device.");
    }
  }, [profileId, settings, settingsReady]);

  useEffect(() => {
    if (!profile || !settingsReady) return;
    let cancelled = false;
    setCalculating(true);
    setEventsReady(false);
    const timer = window.setTimeout(() => {
      try {
        const next = findPersonalTransitAlerts(profile, new Date(), settings);
        if (cancelled) return;
        setEvents(next);
        setEventsReady(true);
        setError(null);
      } catch (reason) {
        if (cancelled) return;
        setEvents([]);
        setEventsReady(true);
        setError(reason instanceof Error ? reason.message : "Personal transits could not be calculated.");
      } finally {
        if (!cancelled) setCalculating(false);
      }
    }, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [profile, settings.houseChanges, settings.natalContacts, settings.dashaChanges, settings.transitingGrahas, settingsReady]);

  useEffect(() => {
    for (const timer of browserTimers.current) window.clearTimeout(timer);
    browserTimers.current = [];

    const native = window.GocharNative;
    if (native) {
      // Keep previously scheduled Android alarms while this chart/settings
      // selection is still loading its refreshed event list.
      if (!profileReady || !settingsReady || (settings.enabled && !eventsReady)) return;
      const deliveries = settings.enabled && permission === "granted"
        ? makeDeliveryEvents(events, Date.now())
        : [];
      native.scheduleNotifications(JSON.stringify(deliveries));
      return;
    }

    if (!settings.enabled || permission !== "granted" || !eventsReady) return;
    const now = Date.now();
    for (const event of makeDeliveryEvents(events, now)) {
      const delay = event.at - now;
      // Browser timers can be throttled or stopped when the browser is closed.
      // Android uses AlarmManager through the native bridge for closed-app alerts.
      if (delay <= 0 || delay > MAX_BROWSER_TIMER) continue;
      const timer = window.setTimeout(() => {
        new Notification(event.title, {
          body: event.body,
          tag: event.id,
          icon: "/gochar-icon-192.png",
        });
      }, delay);
      browserTimers.current.push(timer);
    }

    return () => {
      for (const timer of browserTimers.current) window.clearTimeout(timer);
      browserTimers.current = [];
    };
  }, [events, eventsReady, permission, settings.enabled, profileReady, settingsReady]);

  function updateSettings(patch: Partial<AlertSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function enableNotifications() {
    setError(null);
    const native = window.GocharNative;
    if (native) {
      if (native.hasNotificationPermission()) {
        setSettings((current) => ({ ...current, enabled: true }));
        return;
      }
      const onPermission = (event: Event) => {
        const granted = (event as NativeNotificationPermissionEvent).detail?.granted === true;
        if (granted) {
          setSettings((current) => ({ ...current, enabled: true }));
        } else {
          setError("Notification permission was not granted. Enable it in Android app settings to receive alerts.");
        }
      };
      window.addEventListener("gochar-notification-permission", onPermission, { once: true });
      native.requestNotificationPermission();
      return;
    }

    if (!("Notification" in window)) {
      setError("This browser does not support notifications. Install the Gochar Android app for device alerts.");
      return;
    }
    void Notification.requestPermission().then((result) => {
      setPermission(result);
      if (result === "granted") {
        setSettings((current) => ({ ...current, enabled: true }));
        setError(null);
      } else {
        setError("Notification permission was not granted. You can enable it in your browser settings.");
      }
    });
  }

  const upcoming = events.filter((event) => event.at > Date.now()).slice(0, 6);

  return (
    <section id="personal-transit-alerts" className="mx-auto mt-3 max-w-xl border border-[rgb(145_111_210_/_0.42)] bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-seal">Personal watch</p>
          <h2 className="mt-1 font-display text-3xl leading-none">Personal Transit Alerts</h2>
          <p className="mt-1 text-xs text-muted">Transits measured against your saved birth chart</p>
        </div>
        {settings.enabled ? (
          <span className="shrink-0 rounded-full border border-[rgb(127_194_144_/_0.45)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9bd1a8]">On</span>
        ) : null}
      </div>

      {!profileReady ? (
        <p className="mt-4 text-sm text-muted">Loading saved birth charts…</p>
      ) : profiles.length === 0 ? (
        <div className="mt-4 border border-line bg-paper px-3 py-3">
          <p className="text-sm text-ink">Save a birth chart first to calculate your personal transit dates.</p>
          <Link to="/charts" className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink">
            Create birth chart
          </Link>
        </div>
      ) : (
        <>
          <label className="mt-4 grid gap-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Watch this chart
            <select
              className="h-11 w-full rounded-md border border-line bg-paper px-3 text-sm font-normal normal-case tracking-normal text-ink"
              value={profileId ?? ""}
              onChange={(event) => setProfileId(event.target.value)}
            >
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>{item.name || "Unnamed chart"}</option>
              ))}
            </select>
          </label>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <SettingToggle label="House changes" checked={settings.houseChanges} onChange={(checked) => updateSettings({ houseChanges: checked })} />
            <SettingToggle label="Natal conjunctions & aspects" checked={settings.natalContacts} onChange={(checked) => updateSettings({ natalContacts: checked })} />
            <SettingToggle label="Mahadasha / Antardasha changes" checked={settings.dashaChanges} onChange={(checked) => updateSettings({ dashaChanges: checked })} />
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Track transiting planets</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRAHAS.map((id) => {
                const checked = settings.transitingGrahas.includes(id);
                return (
                  <label key={id} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs ${checked ? "border-[rgb(240_193_78_/_0.65)] bg-[rgb(240_193_78_/_0.1)] text-seal" : "border-line bg-paper text-muted"}`}>
                    <input
                      type="checkbox"
                      className="accent-[#e7bf59]"
                      checked={checked}
                      onChange={(event) => updateSettings({
                        transitingGrahas: event.target.checked
                          ? [...settings.transitingGrahas, id]
                          : settings.transitingGrahas.filter((item) => item !== id),
                      })}
                    />
                    {GRAHA_NAME[id]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {settings.enabled ? (
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink" onClick={() => updateSettings({ enabled: false })}>
                Turn alerts off
              </button>
            ) : (
              <button type="button" className="inline-flex h-11 items-center justify-center rounded-md bg-seal px-4 text-sm font-semibold text-seal-ink" onClick={enableNotifications}>
                Enable device alerts
              </button>
            )}
            <span className="text-[11px] text-muted">
              {permission === "granted" ? "Notification permission granted" : permission === "denied" ? "Notifications blocked in device settings" : "Permission requested only when you enable alerts"}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Gochar schedules a reminder one day before and another at each event. On Android, alerts can arrive while the app is closed. In a browser, Gochar must remain open for timed alerts.
          </p>

          {error ? <p className="mt-3 border border-[rgb(220_112_80_/_0.35)] bg-paper px-3 py-2 text-xs text-[#e9a28e]">{error}</p> : null}

          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-seal">Next 180 days</p>
              <span className="text-[10px] text-muted">{profile?.name || "Birth chart"}</span>
            </div>
            {!eventsReady || calculating ? (
              <p className="mt-3 text-sm text-muted">Calculating your personal transits…</p>
            ) : upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No matching personal events in the next 180 days. Your watch settings are saved.</p>
            ) : (
              <div className="mt-2 divide-y divide-line">
                {upcoming.map((event) => (
                  <article key={event.id} className="py-3 first:pt-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-semibold text-ink">{event.title}</p>
                      <time className="shrink-0 text-right text-[10px] tabular-nums text-seal">{formatStamp(new Date(event.at), profile!.tz)}</time>
                    </div>
                    <p className="mt-1 text-xs text-muted">{event.line}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{event.detail}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 border border-line bg-paper px-3 py-2 text-xs text-ink">
      <input type="checkbox" className="accent-[#e7bf59]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
