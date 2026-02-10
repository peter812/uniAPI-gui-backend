import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Heart,
  MessageSquare,
  Send,
  Search,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PlatformConfig {
  name: string;
  basePath: string;
  features: {
    getUserProfile?: boolean;
    getUserPosts?: boolean;
    likePost?: boolean;
    commentPost?: boolean;
    followUser?: boolean;
    sendDM?: boolean;
    searchTweets?: boolean;
    createTweet?: boolean;
  };
}

const platformConfigs: Record<string, PlatformConfig> = {
  twitter: {
    name: "Twitter",
    basePath: "/api/v1/twitter",
    features: {
      getUserProfile: true,
      getUserPosts: true,
      likePost: true,
      followUser: true,
      searchTweets: true,
      createTweet: true,
    },
  },
  instagram: {
    name: "Instagram",
    basePath: "/api/v1/instagram",
    features: {
      getUserProfile: true,
      getUserPosts: true,
      likePost: true,
      commentPost: true,
      followUser: true,
      sendDM: true,
    },
  },
  tiktok: {
    name: "TikTok",
    basePath: "/api/v1/tiktok",
    features: {
      getUserProfile: true,
      getUserPosts: true,
      likePost: true,
      commentPost: true,
      followUser: true,
      sendDM: true,
    },
  },
  facebook: {
    name: "Facebook",
    basePath: "/api/v1/facebook",
    features: {
      getUserProfile: true,
      getUserPosts: true,
      likePost: true,
      commentPost: true,
      followUser: true,
      sendDM: true,
    },
  },
  linkedin: {
    name: "LinkedIn",
    basePath: "/api/v1/linkedin",
    features: {
      getUserProfile: true,
      getUserPosts: true,
      likePost: true,
      commentPost: true,
      followUser: true,
      sendDM: true,
    },
  },
};

function ResultDisplay({ result }: { result: any }) {
  if (!result) return null;

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {result.success !== false ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <CardTitle className="text-sm">Response</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[300px]">
          <pre className="text-xs font-mono bg-muted p-3 rounded-md whitespace-pre-wrap break-all" data-testid="text-api-result">
            {JSON.stringify(result, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function UserProfileSection({ config }: { config: PlatformConfig }) {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const isTwitter = config.name === "Twitter";

  const mutation = useMutation({
    mutationFn: async (uname: string) => {
      const url = isTwitter
        ? `${config.basePath}/users/by/username/${uname}`
        : `${config.basePath}/users/${uname}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="username-lookup" className="text-xs text-muted-foreground mb-1 block">Username</Label>
          <Input
            id="username-lookup"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            data-testid="input-username-lookup"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => mutation.mutate(username)}
            disabled={mutation.isPending || !username.trim()}
            data-testid="button-lookup-user"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
            Lookup
          </Button>
        </div>
      </div>
      <ResultDisplay result={result} />
    </div>
  );
}

function FollowSection({ config }: { config: PlatformConfig }) {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const isTwitter = config.name === "Twitter";

  const followMutation = useMutation({
    mutationFn: async (uname: string) => {
      const url = isTwitter
        ? `${config.basePath}/users/me/following`
        : `${config.basePath}/users/${uname}/follow`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: isTwitter ? JSON.stringify({ target_username: uname }) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Follow request sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="follow-username" className="text-xs text-muted-foreground mb-1 block">Username to follow</Label>
          <Input
            id="follow-username"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            data-testid="input-follow-username"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => followMutation.mutate(username)}
            disabled={followMutation.isPending || !username.trim()}
            data-testid="button-follow-user"
          >
            {followMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
            Follow
          </Button>
        </div>
      </div>
      <ResultDisplay result={result} />
    </div>
  );
}

function LikeSection({ config }: { config: PlatformConfig }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const isTwitter = config.name === "Twitter";
  const isTiktok = config.name === "TikTok";
  const isFacebook = config.name === "Facebook";
  const isLinkedin = config.name === "LinkedIn";

  const likeMutation = useMutation({
    mutationFn: async (postUrl: string) => {
      let apiUrl: string;
      let body: any;

      if (isTwitter) {
        apiUrl = `${config.basePath}/users/me/likes`;
        body = { tweet_id: postUrl };
      } else if (isTiktok) {
        apiUrl = `${config.basePath}/videos/like`;
        body = { video_url: postUrl };
      } else if (isFacebook || isLinkedin) {
        apiUrl = `${config.basePath}/posts/like`;
        body = { post_url: postUrl };
      } else {
        apiUrl = `${config.basePath}/media/${encodeURIComponent(postUrl)}/like`;
        body = undefined;
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Like sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="like-url" className="text-xs text-muted-foreground mb-1 block">
            {isTwitter ? "Tweet ID" : isTiktok ? "Video URL" : "Post URL"}
          </Label>
          <Input
            id="like-url"
            placeholder={isTwitter ? "Enter tweet ID" : isTiktok ? "Enter video URL" : "Enter post URL"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            data-testid="input-like-url"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => likeMutation.mutate(url)}
            disabled={likeMutation.isPending || !url.trim()}
            data-testid="button-like-post"
          >
            {likeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4 mr-1" />}
            Like
          </Button>
        </div>
      </div>
      <ResultDisplay result={result} />
    </div>
  );
}

function CommentSection({ config }: { config: PlatformConfig }) {
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const isTiktok = config.name === "TikTok";
  const isFacebook = config.name === "Facebook";
  const isLinkedin = config.name === "LinkedIn";

  const commentMutation = useMutation({
    mutationFn: async ({ postUrl, text }: { postUrl: string; text: string }) => {
      let apiUrl: string;
      let body: any;

      if (isTiktok) {
        apiUrl = `${config.basePath}/videos/comment`;
        body = { video_url: postUrl, comment_text: text };
      } else if (isFacebook || isLinkedin) {
        apiUrl = `${config.basePath}/posts/comment`;
        body = { post_url: postUrl, comment: text };
      } else {
        apiUrl = `${config.basePath}/media/${encodeURIComponent(postUrl)}/comments`;
        body = { text };
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Comment posted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="comment-url" className="text-xs text-muted-foreground mb-1 block">
          {isTiktok ? "Video URL" : "Post URL"}
        </Label>
        <Input
          id="comment-url"
          placeholder={isTiktok ? "Enter video URL" : "Enter post URL"}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid="input-comment-url"
        />
      </div>
      <div>
        <Label htmlFor="comment-text" className="text-xs text-muted-foreground mb-1 block">Comment</Label>
        <Textarea
          id="comment-text"
          placeholder="Enter your comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-comment-text"
        />
      </div>
      <Button
        onClick={() => commentMutation.mutate({ postUrl: url, text: comment })}
        disabled={commentMutation.isPending || !url.trim() || !comment.trim()}
        data-testid="button-post-comment"
      >
        {commentMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
        Post Comment
      </Button>
      <ResultDisplay result={result} />
    </div>
  );
}

function DMSection({ config }: { config: PlatformConfig }) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const isInstagram = config.name === "Instagram";

  const dmMutation = useMutation({
    mutationFn: async ({ uname, msg }: { uname: string; msg: string }) => {
      const apiUrl = isInstagram
        ? `${config.basePath}/users/${uname}/dm`
        : `${config.basePath}/dm/send`;
      const body = { username: uname, message: msg };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "DM sent" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="dm-username" className="text-xs text-muted-foreground mb-1 block">Recipient Username</Label>
        <Input
          id="dm-username"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-testid="input-dm-username"
        />
      </div>
      <div>
        <Label htmlFor="dm-message" className="text-xs text-muted-foreground mb-1 block">Message</Label>
        <Textarea
          id="dm-message"
          placeholder="Enter your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-dm-message"
        />
      </div>
      <Button
        onClick={() => dmMutation.mutate({ uname: username, msg: message })}
        disabled={dmMutation.isPending || !username.trim() || !message.trim()}
        data-testid="button-send-dm"
      >
        {dmMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
        Send DM
      </Button>
      <ResultDisplay result={result} />
    </div>
  );
}

function TweetSection({ config }: { config: PlatformConfig }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const tweetMutation = useMutation({
    mutationFn: async (tweetText: string) => {
      const res = await fetch(`${config.basePath}/tweets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tweetText }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Tweet posted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="tweet-text" className="text-xs text-muted-foreground mb-1 block">Tweet Text</Label>
        <Textarea
          id="tweet-text"
          placeholder="What's happening?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-tweet-text"
        />
      </div>
      <Button
        onClick={() => tweetMutation.mutate(text)}
        disabled={tweetMutation.isPending || !text.trim()}
        data-testid="button-post-tweet"
      >
        {tweetMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
        Post Tweet
      </Button>
      <ResultDisplay result={result} />
    </div>
  );
}

function SearchTweetsSection({ config }: { config: PlatformConfig }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch(`${config.basePath}/tweets/search/recent?query=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setResult({ error: error.message });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="search-query" className="text-xs text-muted-foreground mb-1 block">Search Query</Label>
          <Input
            id="search-query"
            placeholder="Search tweets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-search-tweets"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={() => searchMutation.mutate(query)}
            disabled={searchMutation.isPending || !query.trim()}
            data-testid="button-search-tweets"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
            Search
          </Button>
        </div>
      </div>
      <ResultDisplay result={result} />
    </div>
  );
}

export default function PlatformPage({ platform }: { platform: string }) {
  const config = platformConfigs[platform];
  if (!config) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Unknown platform: {platform}</p>
      </div>
    );
  }

  const tabs: { id: string; label: string; icon: typeof User }[] = [];
  if (config.features.getUserProfile) tabs.push({ id: "profile", label: "User Lookup", icon: User });
  if (config.features.createTweet) tabs.push({ id: "tweet", label: "Post Tweet", icon: Send });
  if (config.features.searchTweets) tabs.push({ id: "search", label: "Search", icon: Search });
  if (config.features.likePost) tabs.push({ id: "like", label: "Like", icon: Heart });
  if (config.features.commentPost) tabs.push({ id: "comment", label: "Comment", icon: MessageSquare });
  if (config.features.followUser) tabs.push({ id: "follow", label: "Follow", icon: UserPlus });
  if (config.features.sendDM) tabs.push({ id: "dm", label: "Direct Message", icon: Send });

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid={`text-${platform}-title`}>{config.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Interact with the {config.name} API through UniAPI
          </p>
        </div>
      </div>

      <Tabs defaultValue={tabs[0]?.id || "profile"}>
        <TabsList className="flex flex-wrap h-auto gap-1" data-testid="tabs-platform-actions">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} data-testid={`tab-${tab.id}`}>
                <Icon className="w-3 h-3 mr-1" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Separator className="my-4" />
        {config.features.getUserProfile && (
          <TabsContent value="profile">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">User Profile Lookup</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <UserProfileSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.createTweet && (
          <TabsContent value="tweet">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Send className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Post a Tweet</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <TweetSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.searchTweets && (
          <TabsContent value="search">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Search className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Search Tweets</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <SearchTweetsSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.likePost && (
          <TabsContent value="like">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Heart className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Like a Post</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <LikeSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.commentPost && (
          <TabsContent value="comment">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Comment on a Post</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CommentSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.followUser && (
          <TabsContent value="follow">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Follow a User</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <FollowSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {config.features.sendDM && (
          <TabsContent value="dm">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Send className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">Send Direct Message</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <DMSection config={config} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
