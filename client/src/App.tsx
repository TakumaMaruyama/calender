import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Calendar from "@/pages/calendar";
import NotFound from "@/pages/not-found";
import LeaderManagementPage from "@/pages/leader-management";
import { NotificationPreferencesPage } from "@/pages/notification-preferences";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Calendar} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/leaders" component={LeaderManagementPage} />
      <Route path="/notifications" component={NotificationPreferencesPage} />
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
