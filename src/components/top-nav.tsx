/**
 * Compat shim — kept so legacy `import TopNav from "@/components/top-nav"` calls
 * keep compiling. The new global navigation lives in `<AppShell>` (see layout).
 * Returning null here removes the duplicate top bar that used to render per page.
 */
export default function TopNav(_props: { active?: string }) {
  void _props;
  return null;
}
