import { useEffect } from "react";
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
  title: z.string().min(1, "タイトルを入力してください"),
  type: z.string().min(1, "トレーニング種類を選択してください"),
  date: z.string().min(1, "日付を選択してください"),
  startTime: z.string().min(1, "開始時間を入力してください"),
  endTime: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().nullable().optional(),
  recurringEndDate: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string | null;
}

export function TrainingModal({ isOpen, onClose, selectedDate }: TrainingModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: "",
      date: selectedDate || "",
      startTime: "",
      endTime: "",
      isRecurring: false,
      recurringPattern: null,
      recurringEndDate: null,
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/training-sessions", {
        ...data,
        strokes: null,
        distance: null,
        intensity: null,
        lanes: null,
        menuDetails: null,
        coachNotes: null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "トレーニングセッションが作成されました",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
      
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "トレーニングセッションの作成に失敗しました",
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
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-ocean-900">
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
                  <FormControl>
                    <Input
                      placeholder="例: 自由形スプリント練習"
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-ocean-700">
                    トレーニング種類
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-ocean-200 focus:ring-ocean-500">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aerobic">有酸素</SelectItem>
                      <SelectItem value="sprint">スプリント</SelectItem>
                      <SelectItem value="technique">技術練習</SelectItem>
                      <SelectItem value="strength">筋力トレーニング</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-ocean-700">日付</FormLabel>
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
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-ocean-700">開始時間</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="border-ocean-200 focus:ring-ocean-500 focus:border-ocean-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-ocean-700">終了時間</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
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