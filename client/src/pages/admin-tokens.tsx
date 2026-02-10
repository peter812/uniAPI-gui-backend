import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RotateCw,
  Key,
  Server,
  CheckCircle2,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok, SiFacebook, SiLinkedin } from "react-icons/si";
import type { PlatformToken } from "@shared/schema";

interface AdminTokensProps {
  sessionToken: string;
}

const PLATFORMS = [
  { id: "twitter", label: "Twitter", icon: SiX },
  { id: "instagram", label: "Instagram", icon: SiInstagram },
  { id: "tiktok", label: "TikTok", icon: SiTiktok },
  { id: "facebook", label: "Facebook", icon: SiFacebook },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin },
] as const;

const TOKEN_SUGGESTIONS: Record<string, string[]> = {
  twitter: ["api_key", "api_secret", "access_token", "access_token_secret", "bearer_token"],
  instagram: ["session_id", "csrf_token", "access_token", "app_id", "app_secret"],
  tiktok: ["session_id", "access_token", "api_key", "api_secret"],
  facebook: ["access_token", "app_id", "app_secret", "page_token"],
  linkedin: ["access_token", "client_id", "client_secret"],
};

function TokenItem({
  token,
  sessionToken,
}: {
  token: PlatformToken;
  sessionToken: string;
}) {
  const [showValue, setShowValue] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/admin/platform-tokens/${token.id}`, sessionToken, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete token");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-tokens"] });
      toast({ title: `Token "${token.tokenKey}" deleted` });
    },
    onError: () => {
      toast({ title: "Failed to delete token", variant: "destructive" });
    },
  });

  const maskedValue =
    token.tokenValue.length > 12
      ? token.tokenValue.slice(0, 6) + "..." + token.tokenValue.slice(-4)
      : "***";

  return (
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
      data-testid={`token-item-${token.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge variant="secondary" data-testid={`badge-token-key-${token.id}`}>
          {token.tokenKey}
        </Badge>
        <span className="font-mono text-sm truncate text-muted-foreground" data-testid={`text-token-value-${token.id}`}>
          {showValue ? token.tokenValue : maskedValue}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowValue(!showValue)}
          data-testid={`button-toggle-token-${token.id}`}
        >
          {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
          data-testid={`button-delete-token-${token.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function AddTokenForm({
  platform,
  sessionToken,
}: {
  platform: string;
  sessionToken: string;
}) {
  const [tokenKey, setTokenKey] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [tokenValue, setTokenValue] = useState("");
  const { toast } = useToast();

  const suggestions = TOKEN_SUGGESTIONS[platform] || [];
  const effectiveKey = tokenKey === "__custom__" ? customKey : tokenKey;

  const addMutation = useMutation({
    mutationFn: async () => {
      return authPost("/api/admin/platform-tokens", sessionToken, {
        platform,
        tokenKey: effectiveKey,
        tokenValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/platform-tokens"] });
      setTokenKey("");
      setCustomKey("");
      setTokenValue("");
      toast({ title: `Token added for ${platform}` });
    },
    onError: () => {
      toast({ title: "Failed to add token", variant: "destructive" });
    },
  });

  const canSubmit = effectiveKey.trim() && tokenValue.trim() && !addMutation.isPending;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Token Name</Label>
          <Select value={tokenKey} onValueChange={setTokenKey}>
            <SelectTrigger data-testid={`select-token-key-${platform}`}>
              <SelectValue placeholder="Select token type" />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tokenKey === "__custom__" && (
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Custom Name</Label>
            <Input
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="my_custom_token"
              data-testid={`input-custom-key-${platform}`}
            />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Token Value</Label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={tokenValue}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="Paste token value"
            data-testid={`input-token-value-${platform}`}
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!canSubmit}
            data-testid={`button-add-token-${platform}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlatformTokenCard({
  platformId,
  platformLabel,
  Icon,
  tokens,
  sessionToken,
}: {
  platformId: string;
  platformLabel: string;
  Icon: typeof SiX;
  tokens: PlatformToken[];
  sessionToken: string;
}) {
  const platformTokens = tokens.filter((t) => t.platform === platformId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="w-4 h-4" />
          <CardTitle className="text-base">{platformLabel}</CardTitle>
        </div>
        <Badge variant={platformTokens.length > 0 ? "outline" : "secondary"}>
          {platformTokens.length} token{platformTokens.length !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {platformTokens.length > 0 && (
          <div className="space-y-2">
            {platformTokens.map((t) => (
              <TokenItem key={t.id} token={t} sessionToken={sessionToken} />
            ))}
          </div>
        )}
        <Separator />
        <AddTokenForm platform={platformId} sessionToken={sessionToken} />
      </CardContent>
    </Card>
  );
}

export default function AdminTokens({ sessionToken }: AdminTokensProps) {
  const { toast } = useToast();

  const { data: tokens, isLoading } = useQuery<PlatformToken[]>({
    queryKey: ["/api/admin/platform-tokens"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/platform-tokens", sessionToken);
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      return authPost("/api/admin/restart-python", sessionToken);
    },
    onSuccess: () => {
      toast({
        title: "Python server restarted",
        description: "New tokens are now active",
      });
    },
    onError: () => {
      toast({
        title: "Failed to restart server",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Server className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Scraper Server</CardTitle>
          </div>
          {restartMutation.isSuccess && (
            <Badge variant="outline">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Restarted
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            After adding or changing tokens, restart the Python server to activate them.
          </p>
          <Button
            onClick={() => restartMutation.mutate()}
            disabled={restartMutation.isPending}
            data-testid="button-restart-python"
          >
            <RotateCw className={`w-4 h-4 mr-2 ${restartMutation.isPending ? "animate-spin" : ""}`} />
            {restartMutation.isPending ? "Restarting..." : "Restart Python Server"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        PLATFORMS.map((p) => (
          <PlatformTokenCard
            key={p.id}
            platformId={p.id}
            platformLabel={p.label}
            Icon={p.icon}
            tokens={tokens || []}
            sessionToken={sessionToken}
          />
        ))
      )}
    </div>
  );
}
