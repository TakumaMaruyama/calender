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

  // データベースからリーダーリストを取得
  const { data: swimmerData = [], isLoading } = useQuery({
    queryKey: ['/api/swimmers'],
    select: (data: any[]) => {
      // ID 1-18のスイマーのみを取得し、ID順にソート
      return data
        .filter(swimmer => swimmer.id >= 1 && swimmer.id <= 18)
        .sort((a, b) => a.id - b.id)
        .map(swimmer => ({
          id: swimmer.id,
          name: swimmer.name,
          order: swimmer.id
        }));
    }
  });

  const leaders = swimmerData;

  // リーダー名編集
  const editLeaderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest('PUT', `/api/swimmers/${id}`, { name });
      return response;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditName("");
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      toast({
        title: "リーダー名を更新しました",
        description: "変更が保存されました",
      });
    }
  });

  // リーダー追加
  const addLeaderMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxId = leaders.length > 0 ? Math.max(...leaders.map(l => l.id)) : 18;
      const response = await apiRequest('POST', '/api/swimmers', {
        id: maxId + 1,
        name,
        level: 'intermediate',
        email: null,
        lane: null
      });
      return response;
    },
    onSuccess: () => {
      setNewLeaderName("");
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      toast({
        title: "リーダーを追加しました",
        description: `${newLeaderName}をリーダーリストに追加しました`,
      });
    }
  });

  // リーダー削除
  const deleteLeaderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/swimmers/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      toast({
        title: "リーダーを削除しました",
        description: "リーダーがリストから削除されました",
      });
    }
  });

  // 順序変更
  const reorderMutation = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: number; toId: number }) => {
      const response = await apiRequest('POST', '/api/swimmers/reorder', { fromId, toId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/swimmers'] });
      toast({
        title: "順序を変更しました",
        description: "リーダーの順序が更新されました",
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

  // 順番変更機能
  const moveUp = (id: number) => {
    const currentIndex = leaders.findIndex(leader => leader.id === id);
    if (currentIndex > 0) {
      const targetLeader = leaders[currentIndex - 1];
      reorderMutation.mutate({ fromId: id, toId: targetLeader.id });
    }
  };

  const moveDown = (id: number) => {
    const currentIndex = leaders.findIndex(leader => leader.id === id);
    if (currentIndex < leaders.length - 1) {
      const targetLeader = leaders[currentIndex + 1];
      reorderMutation.mutate({ fromId: id, toId: targetLeader.id });
    }
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