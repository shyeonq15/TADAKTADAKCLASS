import { AppBar } from "@/components/ui/AppBar";

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppBar />
      {children}
    </>
  );
}
