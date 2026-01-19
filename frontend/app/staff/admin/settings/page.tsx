"use client";

import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AiSettings {
  ai_enabled: boolean;
  ai_provider: string;
  ai_api_key: string;
  ai_model: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AiSettings>({
    ai_enabled: false,
    ai_provider: 'openai',
    ai_api_key: '',
    ai_model: 'gpt-3.5-turbo',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiClient.get<AiSettings>('/admin/settings/ai');
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to load AI settings", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/admin/settings/ai', settings);
      toast({
        title: "Settings Saved",
        description: "AI chatbot configuration has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 italic tracking-tight text-center">
          Admin Settings
        </h1>
        <p className="text-slate-400 mt-2 text-center">
          Manage system configurations and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        
        {/* AI Chatbot Settings */}
        <Card className="bg-slate-900 border-white/10 text-slate-100">
          <CardHeader>
            <CardTitle className="text-amber-500">Pupinn AI Chatbot</CardTitle>
            <CardDescription>Configure the automated assistant for the hotel chat system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                <div className="space-y-0.5">
                  <Label className="text-base text-slate-200">Enable AI Chatbot</Label>
                  <p className="text-sm text-slate-400">
                    Allow Pupinn to automatically reply to messages.
                  </p>
                </div>
                <Switch 
                  checked={settings.ai_enabled}
                  onCheckedChange={(checked) => setSettings({...settings, ai_enabled: checked})}
                />
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <Select 
                  value={settings.ai_provider} 
                  onValueChange={(val) => setSettings({...settings, ai_provider: val})}
                >
                  <SelectTrigger className="bg-slate-950 border-white/10">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  value={settings.ai_api_key}
                  onChange={(e) => setSettings({...settings, ai_api_key: e.target.value})}
                  className="bg-slate-950 border-white/10"
                  placeholder="sk-..."
                />
              </div>

              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input 
                  value={settings.ai_model}
                  onChange={(e) => setSettings({...settings, ai_model: e.target.value})}
                  className="bg-slate-950 border-white/10"
                  placeholder="e.g. gpt-4 or gemini-pro"
                />
              </div>

              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save AI Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <ChangePasswordForm userType="staff" />
      </div>
    </div>
  );
}
