import { Navigation } from "@/components/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <div className="flex min-h-svh w-full justify-center p-4 md:p-6 mt-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </>
  );
}
