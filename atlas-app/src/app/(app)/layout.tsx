import { AtlasProvider } from '@/lib/store';
import AppShell from '@/components/app/AppShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AtlasProvider>
      <AppShell>{children}</AppShell>
    </AtlasProvider>
  );
}
