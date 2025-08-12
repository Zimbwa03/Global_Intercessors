import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, Settings, TrendingUp } from "lucide-react";

export function ScheduleNavigation() {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link href="/schedule">
        <Button variant="outline" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Schedule Settings
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button variant="outline" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Dashboard
        </Button>
      </Link>
    </div>
  );
}