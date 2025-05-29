import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { getTrainingTypeColor, formatDistance } from "@/lib/utils";

interface TrainingSidebarProps {
  monthStats?: {
    totalSessions: number;
    totalDistance: number;
    averageAttendance: number;
  };
}

export function TrainingSidebar({ monthStats }: TrainingSidebarProps) {
  return (
    <div className="space-y-6">

      {/* Training Types Legend */}
      <Card className="bg-white shadow-sm border border-ocean-100">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-ocean-900 mb-4">トレーニング種類</h3>
          <div className="space-y-3">
            {[
              { type: 'sprint', label: 'スプリント' },
              { type: 'form', label: 'フォーム' },
              { type: 'endurance_low', label: '持久力（低）' },
              { type: 'endurance_medium', label: '持久力（中）' },
              { type: 'endurance_high', label: '持久力（高）' },
              { type: 'competition_practice', label: '大会練習' },
              { type: 'no_practice', label: '※練習は無し' }
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center space-x-3">
                <div className={`w-4 h-4 ${getTrainingTypeColor(type)} rounded`}></div>
                <span className="text-sm text-ocean-700">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="bg-white shadow-sm border border-ocean-100">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            今月の統計
          </h3>
          
          {monthStats ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ocean-600">総練習回数</span>
                <span className="text-lg font-bold text-ocean-900">{monthStats.totalSessions}回</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-ocean-600">総距離</span>
                <span className="text-lg font-bold text-ocean-900 font-mono">
                  {formatDistance(monthStats.totalDistance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-ocean-600">平均出席率</span>
                <span className="text-lg font-bold text-swimmer">{monthStats.averageAttendance}%</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ocean-600">統計を読み込み中...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
