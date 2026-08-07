import { Search } from "lucide-react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AppHeader({
  title,
  subtitle,
}: AppHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <button
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            bg-white
            shadow-sm
            border
          "
        >
          <Search size={20} />
        </button>
      </div>
    </header>
  );
}