package in.gochar.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public final class AlertScheduler {
    public static final String CHANNEL_ID = "gochar_personal_transits";
    private static final String PREFS = "gochar_transit_alerts";
    private static final String KEY_IDS = "scheduled_ids";
    private static final String KEY_EVENTS = "scheduled_events";
    private static final String ACTION_PREFIX = "in.gochar.app.TRANSIT_ALERT.";

    private AlertScheduler() {}

    public static boolean hasPermission(Context context) {
        return Build.VERSION.SDK_INT < 33
                || context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
    }

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Personal transit alerts",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Reminders for personal Gochar transits and dasha changes");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    public static synchronized void schedule(Context context, String json) {
        cancelScheduled(context);
        if (!hasPermission(context)) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_EVENTS, "[]")
                    .apply();
            return;
        }

        ensureNotificationChannel(context);
        JSONArray events;
        try {
            events = new JSONArray(json == null ? "[]" : json);
        } catch (Exception ignored) {
            events = new JSONArray();
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long now = System.currentTimeMillis();
        long maxFuture = now + 366L * 24L * 60L * 60L * 1000L;
        JSONArray scheduledIds = new JSONArray();
        JSONArray savedEvents = new JSONArray();
        int count = 0;

        for (int index = 0; index < events.length() && count < 40; index++) {
            JSONObject event = events.optJSONObject(index);
            if (event == null) continue;

            String id = event.optString("id", "");
            String title = event.optString("title", "Gochar transit alert");
            String body = event.optString("body", "A personal transit event is approaching.");
            long at = event.optLong("at", 0L);
            if (id.isEmpty() || at <= now + 1000L || at > maxFuture) continue;

            if (title.length() > 120) title = title.substring(0, 120);
            if (body.length() > 600) body = body.substring(0, 600);

            int requestCode = requestCode(id);
            Intent intent = alertIntent(context, id)
                    .putExtra("notificationId", requestCode)
                    .putExtra("title", title)
                    .putExtra("body", body);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent);
            scheduledIds.put(id);
            savedEvents.put(event);
            count++;
        }

        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_IDS, scheduledIds.toString())
                .putString(KEY_EVENTS, savedEvents.toString())
                .apply();
    }

    public static synchronized void rescheduleSaved(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        schedule(context, preferences.getString(KEY_EVENTS, "[]"));
    }

    private static void cancelScheduled(Context context) {
        SharedPreferences preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray ids;
        try {
            ids = new JSONArray(preferences.getString(KEY_IDS, "[]"));
        } catch (Exception ignored) {
            ids = new JSONArray();
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (int index = 0; index < ids.length(); index++) {
            String id = ids.optString(index, "");
            if (id.isEmpty()) continue;
            int requestCode = requestCode(id);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    alertIntent(context, id),
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pendingIntent != null) {
                if (alarmManager != null) alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        }
        preferences.edit().putString(KEY_IDS, "[]").apply();
    }

    private static Intent alertIntent(Context context, String id) {
        return new Intent(context, TransitAlertReceiver.class).setAction(ACTION_PREFIX + id);
    }

    private static int requestCode(String id) {
        int value = id.hashCode() & 0x7fffffff;
        return value == 0 ? 1 : value;
    }
}
