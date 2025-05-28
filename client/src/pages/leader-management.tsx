import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LeaderManagement } from "@/components/leader-management";

export default function LeaderManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-pool-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              カレンダーに戻る
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-ocean-900">
            リーダー管理
          </h1>
        </div>

        {/* リーダー管理コンポーネント */}
        <LeaderManagement />
      </div>
    </div>
  );
}