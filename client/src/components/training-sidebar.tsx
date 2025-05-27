import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, TrendingUp } from "lucide-react";
import { getTrainingTypeColor, getTrainingTypeLabel, formatTime, formatDistance } from "@/lib/utils";
import type { TrainingSession } from "@shared/schema";

interface TrainingSidebarProps {
  todaysSessions: TrainingSession[];
  monthStats?: {
    totalSessions: number;
    totalDistance: number;
    averageAttendance: number;
  };
}

export function TrainingSidebar({ todaysSessions, monthStats }: TrainingSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Today's Training */}
      <Card className="bg-white shadow-sm border border-ocean-100">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center">
            <CalendarDays className="text-pool-500 mr-2 h-5 w-5" />
            今日のトレーニング
          </h3>
          
          {todaysSessions.length === 0 ? (
            <p className="text-sm text-ocean-600">今日のトレーニングはありません</p>
          ) : (
            <div className="space-y-3">
              {todaysSessions.map((session) => (
                <div
                  key={session.id}
                  className={`bg-ocean-50 rounded-lg p-4 border-l-4 ${
                    session.type === 'aerobic' ? 'border-ocean-500' :
                    session.type === 'sprint' ? 'border-pool-500' :
                    session.type === 'technique' ? 'border-swimmer' :
                    'border-energy'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ocean-700">
                      {getTrainingTypeLabel(session.type)}
                    </span>
                    <span className="text-xs text-ocean-500">
                      {formatTime(session.startTime)}
                      {session.endTime && `-${formatTime(session.endTime)}`}
                    </span>
                  </div>
                  
                  {session.distance && (
                    <div className="text-sm text-ocean-600 font-mono">
                      {formatDistance(session.distance)} {session.strokes?.[0] && getTrainingTypeLabel(session.strokes[0])}
                      {session.intensity && ` (${session.intensity})`}
                    </div>
                  )}
                  
                  {session.lanes && (
                    <div className="text-xs text-ocean-500 mt-1">
                      レーン {session.lanes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
