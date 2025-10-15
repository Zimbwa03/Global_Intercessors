import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import PrayerSlotManagement from "@/pages/prayer-slot-management";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import CreateAdmin from "@/pages/create-admin";
import BibleChatPage from './pages/bible-chat';
import PrayerPlanner from './pages/prayer-planner';
import SchedulePage from './pages/schedule';
import ZoomLinkManagement from './pages/management/zoom-link-management';
import FastUpdate from './pages/management/fast-update';
import UrgentNotice from './pages/management/urgent-notice';
import PrayerRequest from './pages/management/prayer-request';
import EventUpdate from './pages/management/event-update';
import SystemMaintenance from './pages/management/system-maintenance';
import AddAdminPage from './pages/management/add-admin';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/prayer-slot-management" component={PrayerSlotManagement} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/management/zoom-link" component={ZoomLinkManagement} />
      <Route path="/admin/management/fast-update" component={FastUpdate} />
      <Route path="/admin/management/urgent-notice" component={UrgentNotice} />
      <Route path="/admin/management/prayer-request" component={PrayerRequest} />
      <Route path="/admin/management/event-update" component={EventUpdate} />
      <Route path="/admin/management/system-maintenance" component={SystemMaintenance} />
      <Route path="/admin/management/add-admin" component={AddAdminPage} />
      <Route path="/create-admin" component={CreateAdmin} />
      <Route path="/bible-chat" component={BibleChatPage} />
      <Route path="/prayer-planner" component={PrayerPlanner} />
      <Route path="/schedule" component={SchedulePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;