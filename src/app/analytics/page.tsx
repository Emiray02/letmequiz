import AnalyticsDashboard from "@/components/analytics-dashboard";
import TopNav from "@/components/top-nav";

export default function AnalyticsPage() {
  return (
    <>
      <TopNav active="/analytics" />
      <main className="app-main app-container pt-8 md:pt-12">
        <div className="max-w-3xl">
          <span className="chip">İlerleme</span>
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
    </>
  );
}
