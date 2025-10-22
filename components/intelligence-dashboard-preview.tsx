import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function IntelligenceDashboardPreview() {
  return (
    <Card className="w-full h-full shadow-lg rounded-lg overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-800">Market Intelligence Dashboard</CardTitle>
        <span className="text-sm text-gray-500">Key Trends</span>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <h4 className="font-medium text-gray-800">Emerging Market Opportunity</h4>
          <p className="text-sm text-gray-600">High growth in wellness sector</p>
        </div>
        <div className="border border-blue-200 rounded-md p-3 bg-blue-50">
          <h4 className="font-medium text-blue-800">Competitor Activity Alert</h4>
          <p className="text-sm text-blue-600">New product launch by competitor Z</p>
        </div>
      </CardContent>
    </Card>
  )
}
