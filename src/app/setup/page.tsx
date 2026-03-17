"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/tauri-db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, Zap, Lock, Globe } from "lucide-react";

export default function SetupPage() {
  const [url, setUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();
  const { refreshDbStatus } = useAuth();

  const handleConnect = async () => {
    if (!url) {
      toast.error("Please enter a database URL");
      return;
    }

    setIsConnecting(true);
    try {
      await db.connectDb(url);
      await refreshDbStatus();
      toast.success("Successfully connected to database!");
      router.push("/login");
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Failed to connect to database");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className="h-screen w-screen flex items-center justify-center bg-background text-foreground p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-lg glass border-border/50 relative z-10">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-primary shrink-0" />
          </div>
          <CardTitle className="text-3xl font-black title-gradient">Initial Setup</CardTitle>
          <CardDescription className="text-muted-foreground text-lg">
            Connect to your Postgres database to get started.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">PostgreSQL URL</p>
                <Input
                  placeholder="postgres://user:password@host:port/dbname"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">Neon Support</span>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">SSL Required</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-8">
          <Button 
            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Initialize Database"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Wait, your database must already have the schema applied via Prisma.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
