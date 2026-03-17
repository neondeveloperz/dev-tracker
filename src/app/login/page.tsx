"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, KanbanSquare } from "lucide-react";
import { db } from "@/lib/tauri-db";
import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      const user = await db.loginUser(data.email, data.password);
      toast.success("Welcome back!");
      login(user);
    } catch (error: any) {
      toast.error(error.toString() || "Invalid email or password");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-neutral-950 text-neutral-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      
      {/* Left side branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative z-10 border-r border-neutral-800/50 bg-neutral-900/20 backdrop-blur-3xl">
        <div className="max-w-xl space-y-8">
          <div className="flex items-center gap-3 text-indigo-400 mb-12">
            <KanbanSquare className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-tight text-white">Dev Tracker</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Ship software faster.
          </h1>
          <p className="text-xl text-neutral-400 font-medium leading-relaxed">
            A minimalist project management tool built for developers who want to focus on code, not configuration.
          </p>
          <div className="flex gap-4 pt-8">
            <div className="h-1 w-12 bg-indigo-500 rounded-full" />
            <div className="h-1 w-4 bg-neutral-800 rounded-full" />
            <div className="h-1 w-4 bg-neutral-800 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right side form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-10">
        <Card className="w-full max-w-md bg-neutral-900/60 border-neutral-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="text-neutral-400">
              Enter your email and password to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  className="bg-neutral-950/50 border-neutral-800 focus-visible:ring-indigo-500 h-11"
                  disabled={isLoading}
                  {...register("email")}
                />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {/* Keep for later auth features */}
                  <span className="text-xs text-indigo-400 cursor-not-allowed opacity-50">Forgot password?</span>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  className="bg-neutral-950/50 border-neutral-800 focus-visible:ring-indigo-500 h-11"
                  disabled={isLoading}
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] h-11 text-base mt-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-neutral-800 pt-6">
            <div className="text-center text-sm text-neutral-400">
              Don't have an account?{" "}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline underline-offset-4 transition-colors">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
