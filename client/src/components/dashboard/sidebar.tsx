import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  userEmail?: string;
}

export function Sidebar({ activeTab, onTabChange, onSignOut, userEmail }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "fas fa-home" },
    { id: "prayer-slot", label: "Prayer Slot", icon: "fas fa-clock" },
    { id: "updates", label: "Updates", icon: "fas fa-bullhorn" },
    { id: "ai-assistant", label: "AI Assistant", icon: "fas fa-robot" },
  ];

  return (
    <div className={cn(
      "bg-brand-primary text-white h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-green-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center">
                <i className="fas fa-praying-hands text-brand-primary text-sm"></i>
              </div>
              <h2 className="font-bold text-lg">Global Intercessors</h2>
            </div>
          )}
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-green-700"
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
          </Button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-green-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center">
              <i className="fas fa-user text-brand-primary"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userEmail || "User"}
              </p>
              <p className="text-xs text-gray-300">Intercessor</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <Button
                onClick={() => onTabChange(item.id)}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left hover:bg-green-700 transition-colors",
                  activeTab === item.id ? "bg-green-700 text-brand-accent" : "text-white",
                  isCollapsed ? "px-3" : "px-4"
                )}
              >
                <i className={`${item.icon} ${isCollapsed ? 'text-center w-full' : 'mr-3'}`}></i>
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-green-700">
        <Button
          onClick={onSignOut}
          variant="ghost"
          className={cn(
            "w-full justify-start text-white hover:bg-red-700 transition-colors",
            isCollapsed ? "px-3" : "px-4"
          )}
        >
          <i className={`fas fa-sign-out-alt ${isCollapsed ? 'text-center w-full' : 'mr-3'}`}></i>
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}