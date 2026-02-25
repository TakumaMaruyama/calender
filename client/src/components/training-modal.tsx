import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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

const asTitleOption = (value: string) => `${TITLE_OPTION_PREFIX}${value}`;
const asTypeOption = (value: string) => `${TYPE_OPTION_PREFIX}${value}`;
const TOURNAMENT_OPTION = asTitleOption(TOURNAMENT_TITLE);

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

const formSchema = z.object({
  trainingOption: z.string().optional(),
  customTraining: z.string().optional(),
  date: z.string().min(1, "日付を選択してください"),
  competitionName: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  recurringEndDate: z.string().optional(),
  weekdays: z.array(z.string()).optional(),
  maxOccurrences: z.number().optional(),
}).refine((data) => {
  return Boolean(resolveTrainingOption(data.trainingOption, data.customTraining));
}, {
  message: "トレーニング項目を選択してください",
});

type FormData = z.infer<typeof formSchema>;

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null;
}

export function TrainingModal({ isOpen, onClose, selectedDate }: TrainingModalProps) {
  const { toast } = useToast();
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trainingOption: "",
      customTraining: "",
      date: selectedDate || "",
      competitionName: "",
      isRecurring: false,
      recurringPattern: "",
      recurringEndDate: "",
      weekdays: [],
      maxOccurrences: undefined,
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const resolvedTraining = resolveTrainingOption(data.trainingOption, data.customTraining);
      if (!resolvedTraining) {
        throw new Error("Training option is required");
      }

      // 大会の場合は2行形式でタイトルを作成
      const finalTitle = resolvedTraining.title === TOURNAMENT_TITLE && data.competitionName?.trim()
        ? `${data.competitionName.trim()}\n${TOURNAMENT_SUFFIX}`
        : resolvedTraining.title;

      const requestData: any = {
        date: data.date,
        startTime: "00:00",
        isRecurring: data.isRecurring,
      };

      if (typeof finalTitle === "string") {
        requestData.title = finalTitle;
      }
      if (resolvedTraining.type) {
        requestData.type = resolvedTraining.type;
      }

      // 繰り返し設定がある場合のみ追加
      if (data.isRecurring) {
        if (data.recurringPattern) requestData.recurringPattern = data.recurringPattern;
        if (data.recurringEndDate) requestData.recurringEndDate = data.recurringEndDate;
        if (selectedWeekdays.length > 0) requestData.weekdays = selectedWeekdays;
        if (data.maxOccurrences) requestData.maxOccurrences = data.maxOccurrences;
      }

      const response = await apiRequest("POST", "/api/training-sessions", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "トレーニングが作成されました",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions/date'] });
      
      onClose();
      form.reset();
      setSelectedWeekdays([]);
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "トレーニングの作成に失敗しました",
        variant: "destructive",
      });
      console.error("Failed to create training session:", error);
    },
  });

  useEffect(() => {
    if (selectedDate) {
      form.setValue("date", selectedDate);
    }
  }, [selectedDate, form]);

  const selectedTrainingOption = form.watch("trainingOption");
  const isCustomTraining = selectedTrainingOption === CUSTOM_TRAINING_OPTION;
  const isTournament = selectedTrainingOption === TOURNAMENT_OPTION;

  const onSubmit = (data: FormData) => {
    if (data.trainingOption === CUSTOM_TRAINING_OPTION && !data.customTraining?.trim()) {
      form.setError("customTraining", {
        type: "manual",
        message: "自由入力の内容を入力してください",
      });
      return;
    }

    createSessionMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md w-full max-h-[95vh] overflow-y-auto m-2">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-ocean-900">
            新規トレーニング
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-ocean-300 text-ocean-500 focus:ring-ocean-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-ocean-700">
                      繰り返しスケジュール設定
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("isRecurring") && (
              <div className="space-y-4 p-4 bg-ocean-50 rounded-lg border border-ocean-200">
                <FormField
                  control={form.control}
                  name="recurringPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-ocean-700">
                        繰り返しパターン
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-ocean-200 focus:ring-ocean-500">
                            <SelectValue placeholder="選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">毎日</SelectItem>
                          <SelectItem value="weekly">毎週</SelectItem>
                          <SelectItem value="biweekly">隔週</SelectItem>
                          <SelectItem value="monthly">毎月</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurringEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-ocean-700">
                          終了日
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="border-ocean-200 focus:ring-ocean-500 focus:border-ocean-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxOccurrences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-ocean-700">
                          最大回数
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10"
                            className="border-ocean-200 focus:ring-ocean-500 focus:border-ocean-500"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-ocean-300 text-ocean-700 hover:bg-ocean-50"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="flex-1 bg-ocean-500 text-white hover:bg-ocean-600"
              >
                {createSessionMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
