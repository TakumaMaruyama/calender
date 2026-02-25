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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Edit, Calendar, CalendarDays, ChevronUp, ChevronDown } from "lucide-react";
import type { TrainingSession } from "@shared/schema";

const CUSTOM_TRAINING_OPTION = "__custom_training__";
const TITLE_OPTION_PREFIX = "title:";
const TYPE_OPTION_PREFIX = "type:";
const TOURNAMENT_TITLE = "大会";
const TOURNAMENT_SUFFIX = "※練習は無し";

const TRAINING_NAME_OPTIONS = [
  { value: " ", label: "(空白)" },
  { value: "ミニレク", label: "ミニレク" },
  { value: "外", label: "外" },
  { value: "ミニ授業", label: "ミニ授業" },
  { value: "IM測定", label: "IM測定" },
  { value: TOURNAMENT_TITLE, label: TOURNAMENT_TITLE },
] as const;

const TRAINING_TYPE_OPTIONS = [
  { value: "sprint", label: "スプリント" },
  { value: "form", label: "フォーム" },
  { value: "endurance_low", label: "持久力（低）" },
  { value: "endurance_medium", label: "持久力（中）" },
  { value: "endurance_high", label: "持久力（高）" },
  { value: "ren_sensei", label: "蓮先生メニュー" },
  { value: "competition_practice", label: "大会練習" },
  { value: "no_practice", label: "※練習は無し" },
] as const;

const TRAINING_NAME_VALUE_SET: Set<string> = new Set(TRAINING_NAME_OPTIONS.map((option) => option.value));
const TRAINING_TYPE_VALUE_SET: Set<string> = new Set(TRAINING_TYPE_OPTIONS.map((option) => option.value));

const asTitleOption = (value: string) => `${TITLE_OPTION_PREFIX}${value}`;
const asTypeOption = (value: string) => `${TYPE_OPTION_PREFIX}${value}`;
const TOURNAMENT_OPTION = asTitleOption(TOURNAMENT_TITLE);

function buildSessionOrderStartTime(index: number): string {
  const boundedMinutes = Math.max(0, Math.min(index, 23 * 60 + 59));
  const hours = Math.floor(boundedMinutes / 60).toString().padStart(2, "0");
  const minutes = (boundedMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function resolveTrainingOption(trainingOption?: string, customTraining?: string): { title?: string; type?: string } | null {
  if (!trainingOption) {
    return null;
  }

  if (trainingOption === CUSTOM_TRAINING_OPTION) {
    const customValue = customTraining?.trim();
    if (!customValue) {
      return null;
    }
    return { title: customValue };
  }

  if (trainingOption.startsWith(TITLE_OPTION_PREFIX)) {
    return { title: trainingOption.slice(TITLE_OPTION_PREFIX.length) };
  }

  if (trainingOption.startsWith(TYPE_OPTION_PREFIX)) {
    return { type: trainingOption.slice(TYPE_OPTION_PREFIX.length) };
  }

  return null;
}

interface DeleteTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TrainingSession | null;
  onSuccess?: () => void;
}

const editFormSchema = z.object({
  trainingOption: z.string().optional(),
  customTraining: z.string().optional(),
  competitionName: z.string().optional(),
});

type EditFormData = z.infer<typeof editFormSchema>;

export function DeleteTrainingModal({ isOpen, onClose, session, onSuccess }: DeleteTrainingModalProps) {
  const [deleteMode, setDeleteMode] = useState<"single" | "future" | "after">("single");
  const { toast } = useToast();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      trainingOption: asTitleOption(" "),
      customTraining: "",
      competitionName: "",
    },
  });

  // セッションが変更されたらフォームをリセット
  useEffect(() => {
    if (!session) {
      return;
    }

    const isTournament = session.title?.includes(`\n${TOURNAMENT_SUFFIX}`);
    const competitionName = isTournament ? session.title?.split("\n")[0] || "" : "";

    let trainingOption = asTitleOption(" ");
    let customTraining = "";

    if (isTournament) {
      trainingOption = TOURNAMENT_OPTION;
    } else if (typeof session.title === "string") {
      if (TRAINING_NAME_VALUE_SET.has(session.title)) {
        trainingOption = asTitleOption(session.title);
      } else {
        trainingOption = CUSTOM_TRAINING_OPTION;
        customTraining = session.title;
      }
    } else if (typeof session.type === "string") {
      if (TRAINING_TYPE_VALUE_SET.has(session.type)) {
        trainingOption = asTypeOption(session.type);
      } else {
        trainingOption = CUSTOM_TRAINING_OPTION;
        customTraining = session.type;
      }
    }

    form.reset({
      trainingOption,
      customTraining,
      competitionName,
    });
  }, [session, form]);

  const { data: daySessions = [] } = useQuery<TrainingSession[]>({
    queryKey: ['/api/training-sessions/date', session?.date],
    enabled: isOpen && !!session?.date,
    queryFn: async () => {
      if (!session?.date) {
        return [];
      }
      const response = await fetch(`/api/training-sessions/date/${session.date}`);
      if (!response.ok) {
        throw new Error("Failed to fetch training sessions for date");
      }
      return response.json();
    },
  });

  const sortedDaySessions = [...daySessions].sort((a, b) =>
    a.startTime.localeCompare(b.startTime) || b.id - a.id
  );
  const currentSessionIndex = session
    ? sortedDaySessions.findIndex((daySession) => daySession.id === session.id)
    : -1;
  const canMoveUp = currentSessionIndex > 0;
  const canMoveDown = currentSessionIndex >= 0 && currentSessionIndex < sortedDaySessions.length - 1;

  const buildMovedSessionIds = (direction: "up" | "down"): number[] | null => {
    if (!session || currentSessionIndex < 0) {
      return null;
    }

    const targetIndex = direction === "up" ? currentSessionIndex - 1 : currentSessionIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedDaySessions.length) {
      return null;
    }

    const reordered = [...sortedDaySessions];
    [reordered[currentSessionIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentSessionIndex]];
    return reordered.map((daySession) => daySession.id);
  };

  const reorderMutation = useMutation({
    mutationFn: async (direction: "up" | "down") => {
      if (!session) {
        return null;
      }

      const reorderedIds = buildMovedSessionIds(direction);
      if (!reorderedIds) {
        return null;
      }

      await apiRequest("POST", "/api/training-sessions/reorder", {
        date: session.date,
        sessionIds: reorderedIds,
      });

      return { date: session.date, sessionIds: reorderedIds };
    },
    onSuccess: (result) => {
      if (result) {
        const orderMap = new Map<number, number>();
        result.sessionIds.forEach((id, index) => {
          orderMap.set(id, index);
        });

        const applyOrderedStartTimes = (sessions?: TrainingSession[]) => {
          if (!sessions) {
            return sessions;
          }
          return sessions.map((sessionItem) => {
            const orderIndex = sessionItem.date === result.date ? orderMap.get(sessionItem.id) : undefined;
            if (orderIndex === undefined) {
              return sessionItem;
            }
            return {
              ...sessionItem,
              startTime: buildSessionOrderStartTime(orderIndex),
            };
          });
        };

        queryClient.setQueriesData<TrainingSession[]>({ queryKey: ['/api/training-sessions/month'] }, applyOrderedStartTimes);
        queryClient.setQueriesData<TrainingSession[]>({ queryKey: ['/api/training-sessions/date'] }, applyOrderedStartTimes);
        queryClient.setQueryData<TrainingSession[]>(['/api/training-sessions/date', result.date], (old) => {
          const updated = applyOrderedStartTimes(old);
          if (!updated) {
            return updated;
          }
          return [...updated].sort((a, b) => a.startTime.localeCompare(b.startTime) || b.id - a.id);
        });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/date'] });
      if (session?.date) {
        queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/date', session.date] });
      }
      toast({
        title: "並び順を更新しました",
        description: "この日のトレーニング表示順を保存しました",
      });
    },
    onError: (error) => {
      console.error("並び順更新エラー:", error);
      toast({
        title: "更新失敗",
        description: "並び順の更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!session) return;

      const resolvedTraining = resolveTrainingOption(data.trainingOption, data.customTraining);
      let finalTitle = resolvedTraining?.title;

      if (resolvedTraining?.title === TOURNAMENT_TITLE && data.competitionName?.trim()) {
        finalTitle = `${data.competitionName.trim()}\n${TOURNAMENT_SUFFIX}`;
      }

      const updateData: any = {
        title: null,
        type: null,
      };

      if (typeof finalTitle === "string" && (finalTitle.trim() !== "" || finalTitle === " ")) {
        updateData.title = finalTitle;
      } else if (resolvedTraining?.type && resolvedTraining.type.trim() !== "") {
        updateData.type = resolvedTraining.type;
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
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/date'] });

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
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/date'] });

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

  const selectedTrainingOption = form.watch("trainingOption");
  const isCustomTraining = selectedTrainingOption === CUSTOM_TRAINING_OPTION;
  const isTournament = selectedTrainingOption === TOURNAMENT_OPTION;

  const handleEdit = (data: EditFormData) => {
    if (data.trainingOption === CUSTOM_TRAINING_OPTION && !data.customTraining?.trim()) {
      form.setError("customTraining", {
        type: "manual",
        message: "自由入力の内容を入力してください",
      });
      return;
    }

    editMutation.mutate(data);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!session) return null;

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

            {sortedDaySessions.length > 1 && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">この日の表示順</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reorderMutation.mutate("up")}
                    disabled={!canMoveUp || reorderMutation.isPending}
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    上へ
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => reorderMutation.mutate("down")}
                    disabled={!canMoveDown || reorderMutation.isPending}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    下へ
                  </Button>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="trainingOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-ocean-700">
                        トレーニング項目
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.clearErrors("customTraining");
                          if (value !== CUSTOM_TRAINING_OPTION) {
                            form.setValue("customTraining", "");
                          }
                          if (value !== TOURNAMENT_OPTION) {
                            form.setValue("competitionName", "");
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-ocean-200 focus:ring-ocean-500">
                            <SelectValue placeholder="選択してください（任意）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="px-2 py-1 text-xs text-ocean-500">トレーニング名</div>
                          {TRAINING_NAME_OPTIONS.map((option) => (
                            <SelectItem key={asTitleOption(option.value)} value={asTitleOption(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs text-ocean-500">トレーニング種目</div>
                          {TRAINING_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={asTypeOption(option.value)} value={asTypeOption(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM_TRAINING_OPTION}>自由入力</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isCustomTraining && (
                  <FormField
                    control={form.control}
                    name="customTraining"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-ocean-700">
                          自由入力
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例: ドルフィン強化"
                            className="border-ocean-200 focus:ring-ocean-500 focus:border-ocean-500"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              form.clearErrors("customTraining");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isTournament && (
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
                      <div className="text-xs text-gray-500">この予定は残し、次回以降を全て削除します</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="future" id="future" />
                  <Label htmlFor="future" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CalendarDays className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="font-medium">この日以降全て削除</div>
                      <div className="text-xs text-gray-500">この日から将来のトレーニングを全て削除します</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
