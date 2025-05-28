import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { UserCheck, Calendar } from "lucide-react";
import type { Swimmer } from "@shared/schema";

interface LeaderDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null;
}

export function LeaderDateModal({ isOpen, onClose, selectedDate }: LeaderDateModalProps) {
  const [selectedSwimmerId, setSelectedSwimmerId] = useState<string>("");
  const { toast } = useToast();

  // スイマー一覧を取得
  const { data: swimmers = [], isLoading: isLoadingSwimmers } = useQuery<Swimmer[]>({
    queryKey: ["/api/swimmers"],
    enabled: isOpen,
  });

  // リーダー設定のミューテーション
  const setLeaderMutation = useMutation({
    mutationFn: async (data: { date: string; swimmerId: number }) => {
      return apiRequest({
        url: "/api/leaders/set-for-date",
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "リーダーを設定しました",
        description: `${selectedDate}からのローテーションが開始されます`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leader"] });
      onClose();
      setSelectedSwimmerId("");
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "リーダー設定に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedDate || !selectedSwimmerId) {
      toast({
        title: "エラー",
        description: "日付とリーダーを選択してください",
        variant: "destructive",
      });
      return;
    }

    setLeaderMutation.mutate({
      date: selectedDate,
      swimmerId: parseInt(selectedSwimmerId),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            リーダー設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {selectedDate && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">
                {formatDate(selectedDate)}からローテーション開始
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="leader-select">リーダーを選択</Label>
            <Select 
              value={selectedSwimmerId} 
              onValueChange={setSelectedSwimmerId}
              disabled={isLoadingSwimmers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingSwimmers ? "読み込み中..." : "リーダーを選択してください"} />
              </SelectTrigger>
              <SelectContent>
                {swimmers.map((swimmer) => (
                  <SelectItem key={swimmer.id} value={swimmer.id.toString()}>
                    {swimmer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
            <p className="font-medium mb-1">注意:</p>
            <p>この操作により、既存のリーダースケジュールは無効になり、選択した日付から新しいローテーションが開始されます。</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedSwimmerId || setLeaderMutation.isPending}
          >
            {setLeaderMutation.isPending ? "設定中..." : "設定する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}