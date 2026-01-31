
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Edit, Calendar, CalendarDays } from "lucide-react";
import type { TrainingSession } from "@shared/schema";

interface DeleteTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
  onSuccess?: () => void;
}

const editFormSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  competitionName: z.string().optional(),
});

type EditFormData = z.infer<typeof editFormSchema>;

export function DeleteTrainingModal({ isOpen, onClose, session, onSuccess }: DeleteTrainingModalProps) {
  const [deleteMode, setDeleteMode] = useState<"single" | "future" | "after">("single");
  const [selectedTrainingName, setSelectedTrainingName] = useState("");
  const { toast } = useToast();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: session?.title || "",
      type: session?.type || "",
      competitionName: "",
    },
  });

  // セッションが変更されたらフォームをリセット
  useEffect(() => {
    if (session) {
      // 大会の場合、タイトルから大会名を抽出
      const isTournament = session.title?.includes('\n※練習は無し');
      const competitionName = isTournament 
        ? session.title?.split('\n')[0] || ""
        : "";
      
      form.reset({
        title: isTournament ? "大会" : (session.title || "_empty_"),
        type: session.type || "_empty_",
        competitionName: competitionName,
      });
      setSelectedTrainingName(isTournament ? "大会" : (session.title || ""));
    }
  }, [session, form]);

  const editMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!session) return;

      // _empty_をnullに変換
      const processedTitle = data.title === "_empty_" ? null : data.title;
      const processedType = data.type === "_empty_" ? null : data.type;

      // 大会の場合は2行形式でタイトルを作成
      const finalTitle = processedTitle === "大会" && data.competitionName 
        ? `${data.competitionName}\n※練習は無し`
        : processedTitle;

      const updateData: any = {};

      // titleまたはtypeのどちらかを設定
      if (finalTitle && finalTitle.trim() !== "") {
        updateData.title = finalTitle;
        updateData.type = null; // titleを設定する場合はtypeをnullに
      } else if (processedType && processedType.trim() !== "") {
        updateData.type = processedType;
        updateData.title = null; // typeを設定する場合はtitleをnullに
      } else {
        // 明示的に空白に設定する場合
        updateData.title = null;
        updateData.type = null;
      }

      const response = await fetch(`/api/training-sessions/${session.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update session");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      
      toast({
        title: "更新完了",
        description: "トレーニングセッションを更新しました",
      });
      
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error("更新エラー:", error);
      toast({
        title: "更新失敗",
        description: "トレーニングセッションの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      
      if (deleteMode === "single") {
        const response = await fetch(`/api/training-sessions/${session.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete session");
        }
      } else {
        const includeCurrent = deleteMode === "future";
        const response = await fetch(`/api/training-sessions/${session.id}/future?includeCurrent=${includeCurrent}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete future sessions");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      
      toast({
        title: "削除完了",
        description: deleteMode === "single" 
          ? "トレーニングセッションを削除しました" 
          : deleteMode === "future"
            ? "この日以降のトレーニングセッションを削除しました"
            : "この予定の次から全て削除しました",
      });
      
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      console.error("削除エラー:", error);
      toast({
        title: "削除失敗",
        description: "トレーニングセッションの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (data: EditFormData) => {
    editMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!session) return null;

  const isRecurringSession = session.isRecurring || Boolean((session as any).originalSessionId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-ocean-700">
            トレーニング管理
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              編集
            </TabsTrigger>
            <TabsTrigger value="delete" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              削除
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            <div className="p-4 bg-ocean-50 rounded-lg border border-ocean-200">
              <p className="text-sm text-ocean-800">
                <span className="font-medium">編集対象:</span> {session.title || session.type || "トレーニング"}
              </p>
              <p className="text-sm text-ocean-600 mt-1">
                日付: {session.date}
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-ocean-700">
                        トレーニング名
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedTrainingName(value);
                          form.setValue("type", "");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-ocean-200 focus:ring-ocean-500">
                            <SelectValue placeholder="選択してください（任意）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="_empty_">(空白)</SelectItem>
                          <SelectItem value="ミニレク">ミニレク</SelectItem>
                          <SelectItem value="外">外</SelectItem>
                          <SelectItem value="ミニ授業">ミニ授業</SelectItem>
                          <SelectItem value="IM測定">IM測定</SelectItem>
                          <SelectItem value="大会">大会</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedTrainingName === "大会" && (
                  <FormField
                    control={form.control}
                    name="competitionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-ocean-700">
                          大会名
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例: 春季水泳大会"
                            className="border-ocean-200 focus:ring-ocean-500 focus:border-ocean-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="text-center text-sm text-ocean-600">または</div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-ocean-700">
                        トレーニング種類
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("title", "");
                          setSelectedTrainingName("");
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-ocean-200 focus:ring-ocean-500">
                            <SelectValue placeholder="選択してください（任意）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sprint">スプリント</SelectItem>
                          <SelectItem value="form">フォーム</SelectItem>
                          <SelectItem value="endurance_low">持久力（低）</SelectItem>
                          <SelectItem value="endurance_medium">持久力（中）</SelectItem>
                          <SelectItem value="endurance_high">持久力（高）</SelectItem>
                          <SelectItem value="competition_practice">大会練習</SelectItem>
                          <SelectItem value="no_practice">※練習は無し</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={editMutation.isPending}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="bg-ocean-500 hover:bg-ocean-600"
                  >
                    {editMutation.isPending ? "更新中..." : "更新"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <span className="font-medium">削除対象:</span> {session.title || session.type || "トレーニング"}
              </p>
              <p className="text-sm text-red-600 mt-1">
                日付: {session.date}
              </p>
            </div>

            {isRecurringSession && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  削除範囲を選択してください
                </Label>
                <RadioGroup value={deleteMode} onValueChange={(value) => setDeleteMode(value as "single" | "future" | "after")}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">この日のみ削除</div>
                        <div className="text-xs text-gray-500">選択した日のトレーニングのみを削除します</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CalendarDays className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">この予定の次から全て削除</div>
                        <div className="text-xs text-gray-500">この予定は残し、次回の繰り返しから全て削除します</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="future" id="future" />
                    <Label htmlFor="future" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CalendarDays className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">この日以降全て削除</div>
                        <div className="text-xs text-gray-500">この日から将来の繰り返しトレーニングを全て削除します</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {!isRecurringSession && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  このトレーニングセッションを削除しますか？
                </p>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={deleteMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "削除中..." : "削除"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
