import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, Mail, Smartphone, Volume2, VolumeX } from "lucide-react";
import type { NotificationPreferences, InsertNotificationPreferences } from "@shared/schema";

interface NotificationPreferencesPageProps {
  swimmerId?: number;
}

export function NotificationPreferencesPage({ swimmerId = 1 }: NotificationPreferencesPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["/api/notification-preferences", swimmerId],
    enabled: !!swimmerId,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updatedPreferences: Partial<InsertNotificationPreferences>) => {
      const response = await fetch(`/api/notification-preferences/${swimmerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPreferences),
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      toast({
        title: "設定を保存しました",
        description: "通知設定が正常に更新されました。",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "設定の保存に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handlePreferenceChange = (key: keyof InsertNotificationPreferences, value: boolean | number | string) => {
    if (!preferences) return;
    
    updatePreferencesMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>通知設定を読み込めませんでした。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">通知設定</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          <a href="/" className="hover:underline">カレンダー</a> / 通知設定
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              通知タイプ
            </CardTitle>
            <CardDescription>
              どのような場合に通知を受け取るかを設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-changes">スケジュール変更</Label>
                <p className="text-sm text-muted-foreground">
                  練習スケジュールが変更されたときに通知
                </p>
              </div>
              <Switch
                id="schedule-changes"
                checked={preferences.scheduleChanges || false}
                onCheckedChange={(checked) => handlePreferenceChange("scheduleChanges", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-reminders">練習リマインダー</Label>
                <p className="text-sm text-muted-foreground">
                  練習開始前にリマインダー通知
                </p>
              </div>
              <Switch
                id="session-reminders"
                checked={preferences.sessionReminders || false}
                onCheckedChange={(checked) => handlePreferenceChange("sessionReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="leader-assignments">リーダー担当</Label>
                <p className="text-sm text-muted-foreground">
                  リーダー担当日の通知
                </p>
              </div>
              <Switch
                id="leader-assignments"
                checked={preferences.leaderAssignments || false}
                onCheckedChange={(checked) => handlePreferenceChange("leaderAssignments", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              通知方法
            </CardTitle>
            <CardDescription>
              通知をどのような方法で受け取るかを設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <div>
                  <Label htmlFor="email-notifications">メール通知</Label>
                  <p className="text-sm text-muted-foreground">
                    メールアドレスに通知を送信
                  </p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <div>
                  <Label htmlFor="push-notifications">プッシュ通知</Label>
                  <p className="text-sm text-muted-foreground">
                    ブラウザでプッシュ通知を表示
                  </p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.pushNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange("pushNotifications", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              タイミング設定
            </CardTitle>
            <CardDescription>
              通知のタイミングを細かく設定できます
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-hours">リマインダー時間</Label>
              <Select
                value={(preferences.reminderHours || 24).toString()}
                onValueChange={(value) => handlePreferenceChange("reminderHours", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1時間前</SelectItem>
                  <SelectItem value="3">3時間前</SelectItem>
                  <SelectItem value="6">6時間前</SelectItem>
                  <SelectItem value="12">12時間前</SelectItem>
                  <SelectItem value="24">24時間前</SelectItem>
                  <SelectItem value="48">48時間前</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                練習開始の何時間前にリマインダーを送信するか
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">サイレント時間（開始）</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHoursStart || "22:00"}
                  onChange={(e) => handlePreferenceChange("quietHoursStart", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">サイレント時間（終了）</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHoursEnd || "07:00"}
                  onChange={(e) => handlePreferenceChange("quietHoursEnd", e.target.value)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              この時間帯は通知を送信しません
            </p>
          </CardContent>
        </Card>

        {/* Test Notification */}
        <Card>
          <CardHeader>
            <CardTitle>通知テスト</CardTitle>
            <CardDescription>
              設定した通知が正常に動作するかテストできます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                toast({
                  title: "テスト通知",
                  description: "これはテスト通知です。設定が正常に動作しています。",
                });
              }}
            >
              <Bell className="h-4 w-4 mr-2" />
              テスト通知を送信
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}