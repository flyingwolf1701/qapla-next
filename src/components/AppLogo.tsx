
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react'; // Using ShieldCheck as a placeholder icon

export function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-sidebar-primary hover:text-sidebar-primary/90 transition-colors">
      <ShieldCheck className="h-7 w-7 text-primary" />
      <span className="text-sidebar-foreground">Qapla' Fitness</span>
    </Link>
  );
}
