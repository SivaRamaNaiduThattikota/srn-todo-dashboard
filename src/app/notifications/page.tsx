"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { fetchActivityLog, fetchFocusSessions, fetchHabitLogs, fetchHabits, fetchNotifReadIds, saveNotifReadIds, type ActivityLog, type FocusSession, type HabitLog, type DailyHabit } from "@/lib/supabase";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

type NotifTab = "All" | "Tasks" | "System";

interface NotifItem {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  sub: string;
  time: string;
  date: string;
  tab: "Tasks" | "System";
}

export default function NotificationsPage() {
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [sessions,    setSessions]    = useState<FocusSession[]>([]);
  const [logs,        setLogs]        = useState<HabitLog[]>([]);
  const [habits,      setHabits]      = useState<DailyHabit[]>([]);
  const [activeTab,   setActiveTab]   = useState<NotifTab>("All");
  const [loading,     setLoading]     = useState(true);
  const [readIds,     setReadIds]     = useState<Set<string>>(new Set());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetchActivityLog(14),
      fetchFocusSessions(14),
      fetchHabitLogs(14),
      fetchHabits(),
      fetchNotifReadIds(),
    ]).then(([log, sess, hlogs, hab, rids]) => {
      setActivityLog(log as ActivityLog[]);
      setSessions(sess as FocusSession[]);
      setLogs(hlogs as HabitLog[]);
      setHabits(hab as DailyHabit[]);
      setReadIds(rids as Set<string>);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Debounced save to Supabase whenever readIds changes
  const persistReadIds = (ids: Set<string>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotifReadIds(ids);
      // Broadcast for sidebar badge
      window.dispatchEvent(new CustomEvent("srn:notif-read", {
        detail: { count: notifications.filter(n => !ids.has(n.id)).length }
      }));
    }, 600);
  };

  const notifications = useMemo((): NotifItem[] => {
    const items: NotifItem[] = [];
    activityLog.forEach((a) => {
      const timeAgo = formatDistanceToNow(new Date(a.created_at), { addSuffix: true });
      const dateStr = format(new Date(a.created_at), "yyyy-MM-dd");
      if (a.action === "completed")
        items.push({ id: `act-${a.id}`, icon: "✅", iconBg: "rgba(16,185,129,0.16)", title: "Task completed", sub: a.new_value ? `"${String(a.new_value).slice(0,60)}"` : "A task was marked done", time: timeAgo, date: dateStr, tab: "Tasks" });
      else if (a.action === "created")
        items.push({ id: `act-${a.id}`, icon: "➕", iconBg: "rgba(124,111,253,0.16)", title: "New task created", sub: a.new_value ? `"${String(a.new_value).slice(0,60)}"` : "A new task was added", time: timeAgo, date: dateStr, tab: "Tasks" });
      else if (a.action === "status_changed")
        items.push({ id: `act-${a.id}`, icon: "🔄", iconBg: "rgba(59,130,246,0.16)", title: "Task status changed", sub: `${a.old_value ?? "?"} → ${a.new_value ?? "?"}`, time: timeAgo, date: dateStr, tab: "Tasks" });
    });
    sessions.filter(s => s.completed).forEach((s) => {
      const mins = s.duration_minutes;
      const dur  = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60>0?mins%60+"m":""}`.trim() : `${mins}m`;
      items.push({ id: `sess-${s.id}`, icon: "⏱", iconBg: "rgba(245,158,11,0.16)", title: "Focus session completed", sub: `${dur} of deep work done`, time: formatDistanceToNow(new Date(s.started_at), { addSuffix: true }), date: format(new Date(s.started_at), "yyyy-MM-dd"), tab: "System" });
    });
    const habitDays = [...new Set(logs.map(l => l.completed_date))].sort().reverse();
    habitDays.slice(0, 7).forEach((dateStr) => {
      if (logs.filter(l => l.completed_date === dateStr).length >= habits.length && habits.length > 0)
        items.push({ id: `habit-${dateStr}`, icon: "🔥", iconBg: "rgba(236,72,153,0.16)", title: "All habits completed!", sub: `All ${habits.length} habits done on ${format(new Date(dateStr+"T12:00:00"), "MMM d")}`, time: formatDistanceToNow(new Date(dateStr+"T12:00:00"), { addSuffix: true }), date: dateStr, tab: "System" });
    });
    return items.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40);
  }, [activityLog, sessions, logs, habits]);

  // Broadcast unread count to sidebar after notifications + readIds are ready
  useEffect(() => {
    if (!loading) {
      const count = notifications.filter(n => !readIds.has(n.id)).length;
      window.dispatchEvent(new CustomEvent("srn:notif-read", { detail: { count } }));
    }
  }, [notifications, readIds, loading]);

  const filtered = useMemo(() =>
    activeTab === "All" ? notifications : notifications.filter(n => n.tab === activeTab),
  [notifications, activeTab]);

  const grouped = useMemo(() => {
    const map: Record<string, NotifItem[]> = {};
    filtered.forEach(n => { if (!map[n.date]) map[n.date] = []; map[n.date].push(n); });
    return Object.entries(map).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filtered]);

  const unreadCount = useMemo(() => notifications.filter(n => !readIds.has(n.id)).length, [notifications, readIds]);
  const counts = { All: notifications.length, Tasks: notifications.filter(n => n.tab === "Tasks").length, System: notifications.filter(n => n.tab === "System").length };

  const markRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    const next = new Set(notifications.map(n => n.id));
    setReadIds(next);
    saveNotifReadIds(next);
    window.dispatchEvent(new CustomEvent("srn:notif-read", { detail: { count: 0 } }));
  };

  const dateLabel = (d: string) => {
    const dt = new Date(d + "T12:00:00");
    if (isToday(dt)) return `${format(dt, "MMM d")} · Today`;
    if (isYesterday(dt)) return `${format(dt, "MMM d")} · Yesterday`;
    return format(dt, "MMM d, yyyy");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-32 md:pb-10">

      <header className="mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Notifications</h1>
            <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
              Activity from the last 14 days · synced to cloud
            </p>
          </div>
          {unreadCount > 0 && (
            <div style={{ padding: "4px 12px", borderRadius: "99px", background: "var(--accent-muted)", color: "var(--accent)", fontSize: "12px", fontWeight: 600, border: "0.5px solid var(--accent-dim)" }}>
              {unreadCount} unread
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: "inline-flex", background: "var(--glass-fill)", border: "0.5px solid var(--glass-border)", borderRadius: "12px", padding: "4px", gap: "2px", marginBottom: "20px" }}>
        {(["All", "Tasks", "System"] as NotifTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: "6px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "-apple-system, sans-serif", border: activeTab === tab ? "0.5px solid var(--accent-dim)" : "none", background: activeTab === tab ? "var(--accent-muted)" : "transparent", color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)", transition: "all 0.15s" }}>
            {tab}
            <span style={{ marginLeft: "6px", background: activeTab === tab ? "var(--accent-muted)" : "var(--glass-fill)", borderRadius: "99px", padding: "1px 7px", fontSize: "11px" }}>{counts[tab]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16"><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Loading…</span></div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 liquid-glass rounded-[22px]">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No notifications yet</p>
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Complete tasks and habits to see activity here</p>
        </div>
      ) : (
        <div>
          {grouped.map(([dateStr, items]) => (
            <div key={dateStr}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", margin: "16px 0 8px" }}>{dateLabel(dateStr)}</div>
              <div className="liquid-glass rounded-[18px] overflow-hidden">
                {items.map((notif, i) => {
                  const isRead = readIds.has(notif.id);
                  return (
                    <div key={notif.id}
                      onClick={() => markRead(notif.id)}
                      style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: i < items.length - 1 ? "0.5px solid var(--glass-border-subtle)" : "none", cursor: "pointer", transition: "background 0.15s", background: isRead ? "transparent" : "var(--accent-muted)", opacity: isRead ? 0.72 : 1, position: "relative" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-fill)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isRead ? "transparent" : "var(--accent-muted)")}>
                      {/* Unread dot */}
                      {!isRead && (
                        <div style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)" }} />
                      )}
                      <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: notif.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{notif.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: isRead ? 400 : 600, color: "var(--text-primary)" }}>{notif.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notif.sub}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0, fontFamily: "monospace", paddingTop: "2px" }}>{notif.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button onClick={markAllRead}
              style={{ width: "100%", padding: "13px", borderRadius: "14px", border: "0.5px solid var(--accent-dim)", background: "var(--accent-muted)", color: "var(--accent)", fontFamily: "-apple-system, sans-serif", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
