import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { authFetch, authPost } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Key,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ListOrdered,
  Settings,
} from "lucide-react";
import { useState } from "react";
import type { ScrapeRequest, AdminSettings } from "@shared/schema";

interface AdminDashboardProps {
  sessionToken: string;
  onLogout: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
    queued: { variant: "secondary", icon: Clock },
    processing: { variant: "default", icon: Loader2 },
    completed: { variant: "outline", icon: CheckCircle2 },
    error: { variant: "destructive", icon: AlertCircle },
    callback_sent: { variant: "outline", icon: Check },
    callback_failed: { variant: "destructive", icon: AlertCircle },
  };

  const { variant, icon: Icon } = config[status] || config.queued;

  return (
    <Badge variant={variant} data-testid={`badge-status-${status}`}>
      <Icon className={`w-3 h-3 mr-1 ${status === "processing" ? "animate-spin" : ""}`} />
      {status.replace("_", " ")}
    </Badge>
  );
}

function ApiKeySection({
  settings,
  sessionToken,
}: {
  settings: AdminSettings | null;
  sessionToken: string;
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const resetMutation = useMutation({
    mutationFn: async () => {
      return authPost("/api/admin/reset-api-key", sessionToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "API key reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset API key", variant: "destructive" });
    },
  });

  const copyKey = () => {
    if (settings?.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const maskedKey = settings?.apiKey
    ? settings.apiKey.slice(0, 8) + "..." + settings.apiKey.slice(-4)
    : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Key className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">API Key</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-sm bg-muted rounded-md px-3 py-2 truncate">
            {showKey ? settings?.apiKey : maskedKey}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowKey(!showKey)}
            data-testid="button-toggle-api-key"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={copyKey}
            data-testid="button-copy-api-key"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <Button
          variant="destructive"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          data-testid="button-reset-api-key"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${resetMutation.isPending ? "animate-spin" : ""}`} />
          Reset API Key
        </Button>
      </CardContent>
    </Card>
  );
}

function InstagramTokenSection({
  settings,
  sessionToken,
}: {
  settings: AdminSettings | null;
  sessionToken: string;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (instagramToken: string) => {
      return authPost("/api/admin/instagram-token", sessionToken, { instagramToken });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setToken("");
      toast({ title: "Instagram token updated" });
    },
    onError: () => {
      toast({ title: "Failed to update token", variant: "destructive" });
    },
  });

  const currentToken = settings?.instagramToken;
  const maskedCurrent = currentToken
    ? currentToken.slice(0, 8) + "..." + currentToken.slice(-4)
    : "Not set";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Settings className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Instagram Token</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Current Token</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 font-mono text-sm bg-muted rounded-md px-3 py-2 truncate">
              {showToken && currentToken ? currentToken : maskedCurrent}
            </div>
            {currentToken && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowToken(!showToken)}
                data-testid="button-toggle-instagram-token"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="new-token">Update Token</Label>
          <div className="flex gap-2">
            <Input
              id="new-token"
              type="password"
              placeholder="Paste new Instagram token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              data-testid="input-instagram-token"
            />
            <Button
              onClick={() => updateMutation.mutate(token)}
              disabled={updateMutation.isPending || !token.trim()}
              data-testid="button-save-instagram-token"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestQueueSection({ sessionToken }: { sessionToken: string }) {
  const { data: requests, isLoading } = useQuery<ScrapeRequest[]>({
    queryKey: ["/api/admin/requests"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/requests", sessionToken);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ListOrdered className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Request Queue</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const statusCounts = {
    queued: requests?.filter((r) => r.status === "queued").length || 0,
    processing: requests?.filter((r) => r.status === "processing").length || 0,
    completed: requests?.filter((r) => ["completed", "callback_sent"].includes(r.status)).length || 0,
    error: requests?.filter((r) => ["error", "callback_failed"].includes(r.status)).length || 0,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ListOrdered className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Request Queue</CardTitle>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {statusCounts.queued}
          </Badge>
          <Badge variant="default" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1" />
            {statusCounts.processing}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {statusCounts.completed}
          </Badge>
          {statusCounts.error > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              {statusCounts.error}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No requests yet</p>
            <p className="text-xs mt-1">Requests will appear here as clients send them</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`request-item-${req.id}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {req.requestType}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {req.queryString}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                      {req.serverUuid.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard({
  sessionToken,
  onLogout,
}: AdminDashboardProps) {
  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/settings", sessionToken);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">UniAPI Admin</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <ApiKeySection settings={settings || null} sessionToken={sessionToken} />
            <InstagramTokenSection settings={settings || null} sessionToken={sessionToken} />
            <RequestQueueSection sessionToken={sessionToken} />
          </>
        )}
      </main>
    </div>
  );
}
