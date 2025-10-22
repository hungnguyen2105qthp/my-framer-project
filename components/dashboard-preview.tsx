import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardPreview() {
  return (
    <Card className="w-full h-full shadow-lg rounded-lg overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-800">Client Insights Dashboard</CardTitle>
        <span className="text-sm text-gray-500">Live Analysis</span>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <h4 className="font-medium text-gray-800">Budget Discussion</h4>
          <p className="text-sm text-gray-600">Client mentioned $3,000 budget</p>
        </div>
        <div className="border border-purple-200 rounded-md p-3 bg-purple-50">
          <h4 className="font-medium text-purple-800">Upsell Opportunity</h4>
          <p className="text-sm text-purple-600">Perfect candidate for premium package</p>
        </div>
      </CardContent>
    </Card>
  )
}
