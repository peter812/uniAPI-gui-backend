import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Plug,
  Unplug,
  Loader2,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiFacebook, SiLinkedin } from "react-icons/si";
import { Button } from "@/components/ui/button";

const platformConfig: Record<string, { icon: typeof SiX; label: string; path: string; hasBridge: boolean }> = {
  twitter: { icon: SiX, label: "Twitter", path: "/twitter", hasBridge: false },
  instagram: { icon: SiInstagram, label: "Instagram", path: "/instagram", hasBridge: true },
  tiktok: { icon: SiTiktok, label: "TikTok", path: "/tiktok", hasBridge: false },
  facebook: { icon: SiFacebook, label: "Facebook", path: "/facebook", hasBridge: true },
  linkedin: { icon: SiLinkedin, label: "LinkedIn", path: "/linkedin", hasBridge: false },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "ok" || status === "healthy") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "degraded") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function BridgeButton({ platform }: { platform: string }) {
  const { toast } = useToast();

  const { data: bridgeStatus } = useQuery<{ platform: string; running: boolean }>({
    queryKey: ["/api/bridge/status", platform],
    queryFn: async () => {
      const res = await fetch(`/api/bridge/status/${platform}`);
      if (!res.ok) throw new Error("Failed to fetch bridge status");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bridge/start/${platform}`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bridge/status", platform] });
      queryClient.invalidateQueries({ queryKey: ["/api/uniapi/platforms"] });
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "Failed to start bridge", variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bridge/stop/${platform}`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bridge/status", platform] });
      queryClient.invalidateQueries({ queryKey: ["/api/uniapi/platforms"] });
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: "Failed to stop bridge", variant: "destructive" });
    },
  });

  const isRunning = bridgeStatus?.running;
  const isPending = startMutation.isPending || stopMutation.isPending;

  return (
    <Button
      size="sm"
      variant={isRunning ? "outline" : "default"}
      onClick={() => (isRunning ? stopMutation.mutate() : startMutation.mutate())}
      disabled={isPending}
      data-testid={`button-bridge-${platform}`}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      ) : isRunning ? (
        <Unplug className="w-3 h-3 mr-1" />
      ) : (
        <Plug className="w-3 h-3 mr-1" />
      )}
      {isPending ? "..." : isRunning ? "Disconnect" : "Connect Bridge"}
    </Button>
  );
}

export default function Dashboard() {
  const { data: apiHealth, isLoading: healthLoading } = useQuery<{ status: string }>({
    queryKey: ["/api/uniapi/health"],
    refetchInterval: 10000,
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/uniapi/platforms"],
    refetchInterval: 15000,
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor your UniAPI services and platform connections
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">API Server Status</CardTitle>
          </div>
          {healthLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <Badge
              variant={apiHealth?.status === "connected" ? "outline" : "destructive"}
              data-testid="badge-api-status"
            >
              {apiHealth?.status === "connected" ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Disconnected</>
              )}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {apiHealth?.status === "connected"
              ? "The Python FastAPI server is running and accepting requests."
              : "The Python FastAPI server is not running. Start the UniAPI workflow to enable platform APIs."}
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Platform Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(platformConfig).map(([key, config]) => {
            const platformData = platforms?.[key];
            const isLoading = platformsLoading;
            const Icon = config.icon;

            return (
              <Card key={key} className="hover-elevate" data-testid={`card-platform-${key}`}>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{config.label}</span>
                        </div>
                        <StatusIcon status={platformData?.status || "unavailable"} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={platformData?.bridge_status === "connected" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          Bridge: {platformData?.bridge_status || "unknown"}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {config.hasBridge && (
                            <BridgeButton platform={key} />
                          )}
                          <Link href={config.path}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-goto-${key}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Start the UniAPI Python server (it runs alongside this dashboard)</p>
          <p>2. Configure platform cookies in <code className="text-xs bg-muted px-1 py-0.5 rounded-md">platforms_auth.json</code></p>
          <p>3. Start the bridge servers for each platform you want to use</p>
          <p>4. Use the platform pages in the sidebar to interact with each API</p>
        </CardContent>
      </Card>
    </div>
  );
}
