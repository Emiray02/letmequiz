import FamilyAccessPanel from "@/components/family-access-panel";
import ParentMonitorDashboard from "@/components/parent-monitor-dashboard";
import TopNav from "@/components/top-nav";

export default function ParentModePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="/parent" />
      <main className="app-container flex-1 pb-24 pt-10 md:pt-14">
        <div className="max-w-3xl">
          <span className="chip chip-warning">Veli paneli</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Çocuğunun gelişimini grafiklerle takip et.
          </h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Görevler, günlük çalışma süresi, doğruluk oranı ve uyarılar tek panelde.
          </p>
        </div>
        <div className="mt-8 grid gap-6">
          <FamilyAccessPanel />
          <ParentMonitorDashboard />
        </div>
      </main>
    </div>
  );
}
