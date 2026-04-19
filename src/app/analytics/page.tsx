import AnalyticsDashboard from "@/components/analytics-dashboard";
import TopNav from "@/components/top-nav";

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active="/analytics" />
      <main className="app-container flex-1 pb-24 pt-10 md:pt-14">
        <div className="max-w-3xl">
          <span className="chip">Analiz</span>
          <h1 className="h-display mt-4 text-3xl md:text-5xl">
            Çalışma sinyallerin ve etkileşim eğilimlerin.
          </h1>
          <p className="mt-3 text-base text-[color:var(--fg-muted)]">
            Haftalık aktivite, doğruluk eğilimi ve oturum yoğunluğu tek bakışta.
          </p>
        </div>
        <div className="mt-8">
          <AnalyticsDashboard />
        </div>
      </main>
    </div>
  );
}
