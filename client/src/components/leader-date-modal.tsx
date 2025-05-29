import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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

interface Leader {
  id: number;
  name: string;
  order: number;
}

interface LeaderDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null;
}

export function LeaderDateModal({ isOpen, onClose, selectedDate }: LeaderDateModalProps) {
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const { toast } = useToast();

  // ローカルストレージからリーダーデータを取得
  useEffect(() => {
    if (isOpen) {
      const savedLeaders = localStorage.getItem('swimtracker-leaders');
      if (savedLeaders) {
        setLeaders(JSON.parse(savedLeaders));
      } else {
        // 初期データ
        const defaultLeaders = [
          { id: 1, name: "ののか", order: 1 },
          { id: 2, name: "有理", order: 2 },
          { id: 3, name: "龍之介", order: 3 },
          { id: 4, name: "彩音", order: 4 },
          { id: 5, name: "勘太", order: 5 },
          { id: 6, name: "悠喜", order: 6 },
          { id: 7, name: "佳翔", order: 7 },
          { id: 8, name: "春舞", order: 8 },
          { id: 9, name: "滉介", order: 9 },
          { id: 10, name: "元翔", order: 10 },
          { id: 11, name: "百華", order: 11 },
          { id: 12, name: "澪心", order: 12 },
          { id: 13, name: "礼志", order: 13 },
          { id: 14, name: "桔伊", order: 14 },
          { id: 15, name: "虹日", order: 15 },
          { id: 16, name: "弥広", order: 16 }
        ];
        setLeaders(defaultLeaders);
      }
    }
  }, [isOpen]);

  // リーダー設定のミューテーション
  const setLeaderMutation = useMutation({
    mutationFn: async (data: { date: string; leaderId: number }) => {
      return await apiRequest("POST", "/api/leaders/set-for-date", { 
        date: data.date, 
        swimmerId: data.leaderId,
        leaders: leaders
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
      setSelectedLeaderId("");
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
    if (!selectedDate || !selectedLeaderId) {
      toast({
        title: "エラー",
        description: "日付とリーダーを選択してください",
        variant: "destructive",
      });
      return;
    }

    setLeaderMutation.mutate({
      date: selectedDate,
      leaderId: parseInt(selectedLeaderId),
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
              value={selectedLeaderId} 
              onValueChange={setSelectedLeaderId}
            >
              <SelectTrigger>
                <SelectValue placeholder="リーダーを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {leaders.sort((a, b) => a.order - b.order).map((leader) => (
                  <SelectItem key={leader.id} value={leader.id.toString()}>
                    {leader.name}
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
            disabled={!selectedLeaderId || setLeaderMutation.isPending}
          >
            {setLeaderMutation.isPending ? "設定中..." : "設定する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}