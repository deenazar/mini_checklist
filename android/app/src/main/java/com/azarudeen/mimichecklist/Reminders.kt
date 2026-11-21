package com.azarudeen.mimichecklist

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import java.util.Calendar

/**
 * Alarms for task reminders (the page sends the next ~60 as [{id, at (ms), title, body}] whenever they change),
 * the daily planning nudge, and the "time's up" alert for the running timer.
 * Uses exact alarms when Android allows them, otherwise slightly inexact ones (a minute or so late at most).
 */
object Reminders {
    private const val PREFS = "mimi-reminders"
    private const val KEY_LIST = "list"
    private const val KEY_CODES = "codes"
    private const val KEY_PLAN = "plan"
    private const val CODE_PLAN = 9001
    private const val CODE_TIMER = 9002

    private fun am(ctx: Context) = ctx.getSystemService(AlarmManager::class.java)

    private fun intent(ctx: Context, kind: String, id: String, title: String, body: String): Intent =
        Intent(ctx, ReminderReceiver::class.java).putExtra("kind", kind).putExtra("id", id).putExtra("title", title).putExtra("body", body)

    private fun pending(ctx: Context, code: Int, i: Intent?): PendingIntent? {
        val flags = PendingIntent.FLAG_IMMUTABLE or (if (i == null) PendingIntent.FLAG_NO_CREATE else PendingIntent.FLAG_UPDATE_CURRENT)
        return PendingIntent.getBroadcast(ctx, code, i ?: Intent(ctx, ReminderReceiver::class.java), flags)
    }

    private fun setAt(ctx: Context, at: Long, pi: PendingIntent) {
        val a = am(ctx)
        val exact = Build.VERSION.SDK_INT < 31 || a.canScheduleExactAlarms()
        runCatching {
            if (exact) a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi) else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    fun scheduleTasks(ctx: Context, list: JSONArray, save: Boolean = true) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        // Cancel the ones set last time, then set the new list.
        prefs.getStringSet(KEY_CODES, emptySet())?.forEach { code ->
            code.toIntOrNull()?.let { c -> pending(ctx, c, null)?.let { am(ctx).cancel(it); it.cancel() } }
        }
        val now = System.currentTimeMillis()
        val codes = mutableSetOf<String>()
        for (k in 0 until minOf(list.length(), 60)) {
            val o = list.optJSONObject(k) ?: continue
            val id = o.optString("id"); val at = o.optLong("at")
            if (id.isBlank() || at <= now) continue
            val code = ("task-$id").hashCode() and 0x3fffffff
            val pi = pending(ctx, code, intent(ctx, "task", id, o.optString("title", "Reminder").take(120), o.optString("body", "").take(200))) ?: continue
            setAt(ctx, at, pi)
            codes += code.toString()
        }
        val editor = prefs.edit().putStringSet(KEY_CODES, codes)
        if (save) editor.putString(KEY_LIST, list.toString())
        editor.apply()
    }

    fun setDailyPlan(ctx: Context, on: Boolean, time: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_PLAN, if (on) time else "").apply()
        pending(ctx, CODE_PLAN, null)?.let { am(ctx).cancel(it); it.cancel() }
        if (!on) return
        val (h, m) = time.split(":").map { it.toIntOrNull() ?: 0 }.let { (it.getOrElse(0) { 8 }) to (it.getOrElse(1) { 0 }) }
        val next = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, h); set(Calendar.MINUTE, m); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
        }.timeInMillis
        val pi = pending(ctx, CODE_PLAN, intent(ctx, "plan", "plan", "Plan your day with Mimi 🐾", "Add today’s tasks so Mimi can cheer you on.")) ?: return
        setAt(ctx, next, pi) // the receiver sets the next day's alarm when this one fires
    }

    fun setTimerEnd(ctx: Context, at: Long, title: String) {
        val pi = pending(ctx, CODE_TIMER, intent(ctx, "timer", "timer", "⏰ Time’s up", title)) ?: return
        setAt(ctx, at, pi)
    }

    fun cancelTimerEnd(ctx: Context) {
        pending(ctx, CODE_TIMER, null)?.let { am(ctx).cancel(it); it.cancel() }
    }

    /** After a reboot alarms are gone: set them again from what was saved. */
    fun restore(ctx: Context) {
        val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.getString(KEY_LIST, null)?.let { runCatching { scheduleTasks(ctx, JSONArray(it), save = false) } }
        prefs.getString(KEY_PLAN, "")?.takeIf { it.isNotBlank() }?.let { setDailyPlan(ctx, true, it) }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, i: Intent) {
        Notifier.createChannels(ctx)
        val kind = i.getStringExtra("kind") ?: "task"
        val id = i.getStringExtra("id") ?: kind
        Notifier.post(ctx, id.hashCode() and 0x3fffffff, i.getStringExtra("title") ?: "Reminder", i.getStringExtra("body") ?: "")
        if (kind == "plan") {
            val time = ctx.getSharedPreferences("mimi-reminders", Context.MODE_PRIVATE).getString("plan", "") ?: ""
            if (time.isNotBlank()) Reminders.setDailyPlan(ctx, true, time)
        }
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, i: Intent) {
        if (i.action == Intent.ACTION_BOOT_COMPLETED) Reminders.restore(ctx)
    }
}
