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

const formSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  date: z.string().min(1, "日付を選択してください"),
  competitionName: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  recurringEndDate: z.string().optional(),
  weekdays: z.array(z.string()).optional(),
  maxOccurrences: z.number().optional(),
}).refine((data) => data.title || data.type, {
  message: "トレーニング名またはトレーニング種類のどちらかを選択してください",
});

type FormData = z.infer<typeof formSchema>;

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null;
}

export function TrainingModal({ isOpen, onClose, selectedDate }: TrainingModalProps) {
  const { toast } = useToast();
  const [selectedTrainingName, setSelectedTrainingName] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "",
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
      // 大会の場合は3行形式でタイトルを作成
      const finalTitle = data.title === "大会" && data.competitionName 
        ? `大会\n${data.competitionName}\n※練習は無し`
        : data.title;

      const requestData: any = {
        date: data.date,
        startTime: "00:00",
        isRecurring: data.isRecurring,
      };

      // titleまたはtypeのどちらかのみを含める
      if (finalTitle) {
        requestData.title = finalTitle;
      }
      if (data.type) {
        requestData.type = data.type;
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
      
      onClose();
      form.reset();
      setSelectedTrainingName("");
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

  const onSubmit = (data: FormData) => {
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
                      // トレーニング名を選択したらトレーニング種類をクリア
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
                      <SelectItem value=" ">(空白)</SelectItem>
                      <SelectItem value="ミニレク">ミニレク</SelectItem>
                      <SelectItem value="外">外</SelectItem>
                      <SelectItem value="ミニ授業">ミニ授業</SelectItem>
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
                      // トレーニング種類を選択したらトレーニング名をクリア
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