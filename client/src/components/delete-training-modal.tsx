import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Calendar, CalendarDays } from "lucide-react";
import type { TrainingSession } from "@shared/schema";

interface DeleteTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
  onSuccess?: () => void;
}

export function DeleteTrainingModal({ isOpen, onClose, session, onSuccess }: DeleteTrainingModalProps) {
  const [deleteMode, setDeleteMode] = useState<"single" | "future">("single");
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      
      if (deleteMode === "single") {
        // 単一のセッションを削除
        const response = await fetch(`/api/training-sessions/${session.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete session");
        }
      } else {
        // この日以降の繰り返しセッションを削除
        const response = await fetch(`/api/training-sessions/${session.id}/future`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete future sessions");
        }
      }
    },
    onSuccess: () => {
      // キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      
      toast({
        title: "削除完了",
        description: deleteMode === "single" 
          ? "トレーニングセッションを削除しました" 
          : "この日以降のトレーニングセッションを削除しました",
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

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!session) return null;

  // 繰り返しセッションかどうかを判定
  // originalSessionIdがある場合は繰り返しから生成されたセッション
  const isRecurringSession = session.isRecurring || Boolean((session as any).originalSessionId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            トレーニング削除
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <span className="font-medium">削除対象:</span> {session.title || "トレーニング"}
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
              <RadioGroup value={deleteMode} onValueChange={(value) => setDeleteMode(value as "single" | "future")}>
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
        </div>

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
      </DialogContent>
    </Dialog>
  );
}