import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit3, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Leader {
  id: number;
  name: string;
  order: number;
}

export function LeaderManagement() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newLeaderName, setNewLeaderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // リーダーリストの状態管理（ローカルストレージから読み込み）
  const [leaders, setLeaders] = useState<Leader[]>([]);

  // 初期化時にローカルストレージからデータを読み込み
  useEffect(() => {
    const savedLeaders = localStorage.getItem('scheduler-leaders');
    if (savedLeaders) {
      setLeaders(JSON.parse(savedLeaders));
    } else {
      // 初期データ（あなたの16人のリーダーリスト）
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
      localStorage.setItem('scheduler-leaders', JSON.stringify(defaultLeaders));
    }
  }, []);

  // データベースと同期する関数
  const syncWithDatabase = async (leaderList: Leader[]) => {
    try {
      await fetch('/api/leaders/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leaders: leaderList }),
      });
      console.log('リーダーリストをデータベースと同期しました');
    } catch (error) {
      console.error('データベース同期エラー:', error);
    }
  };

  // リーダーリストが変更されたらローカルストレージに保存し、データベースと同期
  useEffect(() => {
    if (leaders.length > 0) {
      localStorage.setItem('scheduler-leaders', JSON.stringify(leaders));
      // データベースと同期
      syncWithDatabase(leaders);
    }
  }, [leaders]);

  // リーダー追加（最後に追加）
  const addLeaderMutation = useMutation({
    mutationFn: async (name: string) => {
      // 既存の最大IDを取得して+1（安全な範囲で）
      const maxId = leaders.length > 0 ? Math.max(...leaders.map(l => l.id)) : 16;
      const newLeader = { id: maxId + 1, name, order: leaders.length + 1 };
      setLeaders(prev => [...prev, newLeader]);
      return newLeader;
    },
    onSuccess: () => {
      setNewLeaderName("");
      toast({
        title: "リーダーを追加しました",
        description: `${newLeaderName}をリーダーリストに追加しました`,
      });
    }
  });

  // リーダー削除
  const deleteLeaderMutation = useMutation({
    mutationFn: async (id: number) => {
      setLeaders(prev => prev.filter(leader => leader.id !== id));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "リーダーを削除しました",
        description: "リーダーリストから削除しました",
      });
    }
  });

  // リーダー名編集
  const editLeaderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      setLeaders(prev => prev.map(leader => 
        leader.id === id ? { ...leader, name } : leader
      ));
      return { success: true };
    },
    onSuccess: () => {
      setEditingId(null);
      setEditName("");
      toast({
        title: "リーダー名を更新しました",
        description: "変更が保存されました",
      });
    }
  });

  const handleEdit = (leader: Leader) => {
    setEditingId(leader.id);
    setEditName(leader.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      editLeaderMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  // 順番を上に移動
  const moveUp = (id: number) => {
    setLeaders(prev => {
      const sortedLeaders = [...prev].sort((a, b) => a.order - b.order);
      const index = sortedLeaders.findIndex(leader => leader.id === id);
      if (index > 0) {
        const newLeaders = [...sortedLeaders];
        [newLeaders[index], newLeaders[index - 1]] = [newLeaders[index - 1], newLeaders[index]];
        // order値を再計算
        return newLeaders.map((leader, idx) => ({ ...leader, order: idx + 1 }));
      }
      return prev;
    });
  };

  // 順番を下に移動
  const moveDown = (id: number) => {
    setLeaders(prev => {
      const sortedLeaders = [...prev].sort((a, b) => a.order - b.order);
      const index = sortedLeaders.findIndex(leader => leader.id === id);
      if (index < sortedLeaders.length - 1) {
        const newLeaders = [...sortedLeaders];
        [newLeaders[index], newLeaders[index + 1]] = [newLeaders[index + 1], newLeaders[index]];
        // order値を再計算
        return newLeaders.map((leader, idx) => ({ ...leader, order: idx + 1 }));
      }
      return prev;
    });
  };

  // 特定位置に挿入
  const insertAt = (name: string, position: number) => {
    // 既存の最大IDを取得して+1
    const maxId = leaders.length > 0 ? Math.max(...leaders.map(l => l.id)) : 16;
    const newLeader = { id: maxId + 1, name: name.trim(), order: position };
    setLeaders(prev => {
      const sortedLeaders = [...prev].sort((a, b) => a.order - b.order);
      // 挿入位置以降のorderを1つずつ増加
      const updatedLeaders = sortedLeaders.map(leader => 
        leader.order >= position ? { ...leader, order: leader.order + 1 } : leader
      );
      return [...updatedLeaders, newLeader].sort((a, b) => a.order - b.order);
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleAddLeader = () => {
    if (newLeaderName.trim()) {
      addLeaderMutation.mutate(newLeaderName.trim());
    }
  };

  const moveLeader = (id: number, direction: 'up' | 'down') => {
    // 順序変更のロジック（簡略化）
    toast({
      title: "順序を変更しました",
      description: "リーダーの順序が更新されました",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          リーダー管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 新しいリーダー追加 */}
        <div className="flex gap-2">
          <Input
            placeholder="新しいリーダー名を入力"
            value={newLeaderName}
            onChange={(e) => setNewLeaderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLeader()}
          />
          <Button 
            onClick={handleAddLeader}
            disabled={!newLeaderName.trim() || addLeaderMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            追加
          </Button>
        </div>

        {/* リーダーリスト */}
        <div className="space-y-2">
          {leaders.map((leader, index) => (
            <div
              key={leader.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <Badge variant="outline" className="min-w-[60px] justify-center">
                {index + 1}順目
              </Badge>
              
              {editingId === leader.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-medium">{leader.name}</span>
                  <div className="flex gap-1">
                    {/* 順番変更ボタン */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveUp(leader.id)}
                      disabled={index === 0}
                      title="上に移動"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveDown(leader.id)}
                      disabled={index === leaders.length - 1}
                      title="下に移動"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(leader)}
                      title="名前編集"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLeaderMutation.mutate(leader.id)}
                      disabled={deleteLeaderMutation.isPending}
                      title="削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {leaders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            リーダーが登録されていません
          </div>
        )}

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium mb-1">3日リーダー制度について:</p>
          <p>• 月曜日〜水曜日、金曜日〜日曜日の3日間ずつ交代</p>
          <p>• 上記の順序でリーダーが自動的にローテーションします</p>
        </div>
      </CardContent>
    </Card>
  );
}