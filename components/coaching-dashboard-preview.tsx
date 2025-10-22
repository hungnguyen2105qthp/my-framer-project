import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CoachingDashboardPreview() {
  return (
    <Card className="w-full h-full shadow-lg rounded-lg overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-800">Coaching Suggestions</CardTitle>
        <span className="text-sm text-green-600">Active</span>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="border border-green-200 rounded-md p-3 bg-green-50">
          <h4 className="font-medium text-green-800">Suggest Add-on Service</h4>
          <p className="text-sm text-green-600">Client shows interest in skincare routine</p>
        </div>
        <div className="border border-yellow-200 rounded-md p-3 bg-yellow-50">
          <h4 className="font-medium text-yellow-800">Address Concern</h4>
          <p className="text-sm text-yellow-600">Client mentioned budget constraints</p>
        </div>
      </CardContent>
    </Card>
  )
}
