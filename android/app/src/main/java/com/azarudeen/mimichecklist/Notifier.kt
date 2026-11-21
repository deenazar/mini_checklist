package com.azarudeen.mimichecklist

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import org.json.JSONObject

/** Notification channels, the ongoing timer notification and one-off reminder notifications. */
object Notifier {
    const val CH_REMIND = "reminders"
    const val CH_TIMER = "timer"
    private const val TIMER_ID = 7001
    private val LAVENDER = Color.parseColor("#9D84FF")

    fun createChannels(ctx: Context) {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CH_REMIND, "Reminders", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Task reminders, water reminders and the daily planning nudge"
            enableVibration(true)
        })
        nm.createNotificationChannel(NotificationChannel(CH_TIMER, "Running timer", NotificationManager.IMPORTANCE_LOW).apply {
            description = "The task you are focusing on, with a live countdown"
            setShowBadge(false)
        })
    }

    private fun openApp(ctx: Context, code: Int): PendingIntent {
        val i = Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    fun post(ctx: Context, id: Int, title: String, body: String) {
        val n = Notification.Builder(ctx, CH_REMIND)
            .setSmallIcon(R.drawable.ic_stat_mimi)
            .setColor(LAVENDER)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText("Mimi Checklist")
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(openApp(ctx, id))
            .build()
        runCatching { ctx.getSystemService(NotificationManager::class.java).notify(id, n) }
    }

    /**
     * `{state:'run', id, title, list, color, startedAt (ms), plannedMin, done, total}`:
     * counts down to the planned end (like the iPhone's Dynamic Island), or counts up without a plan.
     */
    fun showTimer(ctx: Context, o: JSONObject) {
        val title = o.optString("title", "Focusing")
        val startedAt = o.optLong("startedAt", System.currentTimeMillis())
        val planned = o.optInt("plannedMin", 0)
        val end = startedAt + planned * 60_000L
        val countDown = planned > 0 && end > System.currentTimeMillis()
        val list = o.optString("list", "")
        val text = buildString {
            if (planned > 0) append(if (planned >= 60) "${planned / 60} h ${if (planned % 60 > 0) "${planned % 60} min " else ""}plan" else "$planned min plan")
            else append("No time plan")
            append(" · ${o.optInt("done")}/${o.optInt("total")} done today")
            if (list.isNotBlank()) append(" · $list")
        }
        val color = runCatching { Color.parseColor(o.optString("color", "#9D84FF")) }.getOrDefault(LAVENDER)
        val b = Notification.Builder(ctx, CH_TIMER)
            .setSmallIcon(R.drawable.ic_stat_mimi)
            .setColor(color)
            .setContentTitle(if (planned > 0 && !countDown) "Time’s up · $title" else "Focusing · $title")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setWhen(if (countDown) end else if (planned > 0) end else startedAt)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setContentIntent(openApp(ctx, TIMER_ID))
        if (countDown) b.setChronometerCountDown(true)
        runCatching { ctx.getSystemService(NotificationManager::class.java).notify(TIMER_ID, b.build()) }
        // A heads-up when the plan runs out, even if the app is closed.
        if (countDown) Reminders.setTimerEnd(ctx, end, title) else Reminders.cancelTimerEnd(ctx)
    }

    fun endTimer(ctx: Context) {
        runCatching { ctx.getSystemService(NotificationManager::class.java).cancel(TIMER_ID) }
        Reminders.cancelTimerEnd(ctx)
    }
}
