import { Card, CardContent } from "@/components/ui/card";
import { getTrainingTypeColor } from "@/lib/utils";

export function TrainingSidebar() {
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
    </div>
  );
}
