import StudentBottomNav from "@/components/dashboard/StudentBottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] relative">
      {/* 
        This layout wraps all /dashboard/* pages.
        The bottom padding here is handled on a per-page basis to allow for edge-to-edge designs if needed,
        but the pb-24 utility is typically added to page containers.
      */}
      {children}
      <StudentBottomNav />
    </div>
  );
}
