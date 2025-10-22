# Sales Performance Analytics Implementation

This implementation provides comprehensive sales performance analysis for transcripts with `salesPerformance` data, including protocol score averaging and insights aggregation.

## Files Created

### 1. `/lib/sales-performance-utils.ts`
Core utilities for sales performance calculations:

- **`calculateSalesPerformanceAverages()`**: Calculates average protocol scores and aggregates insights across filtered transcripts
- **`getSalesPerformanceInsights()`**: Generates actionable insights from the aggregated data
- **`formatIndividualSalesPerformance()`**: Formats individual transcript sales performance for display

### 2. `/components/sales-performance-summary.tsx`
React components for displaying sales performance data:

- **`SalesPerformanceSummary`**: Main component for ACTIVITY section showing averages and team insights
- **`IndividualSalesPerformance`**: Component for individual transcript view showing all metrics

### 3. `/lib/integration-example.ts`
Integration examples and mock data for testing

## Key Features

### For ACTIVITY Section (Team Overview)
- **Average Protocol Score**: Calculated across all filtered transcripts
- **Grade Distribution**: Visual breakdown of excellent/good/fair/poor ratings
- **Confidence Distribution**: Low/medium/high confidence analysis
- **Common Improvement Areas**: Most frequent areas needing attention
- **Team Key Strengths**: Most common strengths across consultations
- **Top Protocol Adherence**: Most followed protocol elements

### For Individual Transcript View
- **Protocol Score**: Individual score out of 10 with visual progress bar
- **Overall Grade & Confidence**: Clearly displayed with color coding
- **Key Strengths**: Bullet-pointed list of consultant strengths
- **Improvement Areas**: Specific areas for development
- **Protocol Adherence**: Which protocols were followed
- **Recommendations**: Specific coaching suggestions

## Data Structure Expected

```typescript
interface SalesPerformance {
  confidence: 'low' | 'medium' | 'high'
  improvementAreas: string[]
  keyStrengths: string[]
  overallGrade: 'poor' | 'fair' | 'good' | 'excellent'
  protocolAdherence: string[]
  protocolScore: number
  recommendations: string
}

interface Transcript {
  id: string
  salesPerformance: SalesPerformance
  // other transcript fields...
}
```

## Integration Steps

### 1. For ACTIVITY Section

```tsx
import { SalesPerformanceSummary } from '@/components/sales-performance-summary'
import { calculateSalesPerformanceAverages } from '@/lib/sales-performance-utils'

// Filter your transcripts for the individual/date range
const filteredTranscripts = transcripts.filter(/* your filtering logic */)

// Calculate averages
const salesPerformanceData = calculateSalesPerformanceAverages(filteredTranscripts)

// Display in your ACTIVITY section
<SalesPerformanceSummary 
  averages={salesPerformanceData}
  showDetailedBreakdown={true}
/>
```

### 2. For Individual Transcript View

```tsx
import { IndividualSalesPerformance } from '@/components/sales-performance-summary'

// In your transcript detail view
{transcript.salesPerformance && (
  <IndividualSalesPerformance 
    salesPerformance={transcript.salesPerformance}
  />
)}
```

## Visual Features

### Color Coding System
- **Protocol Scores**: Green (8+), Yellow (6-7.9), Red (0-5.9)
- **Grades**: Green (excellent), Blue (good), Yellow (fair), Red (poor)
- **Confidence**: Green (high), Yellow (medium), Red (low)

### Interactive Elements
- Progress bars for score visualization
- Badges for categorical data
- Collapsible sections for detailed breakdowns
- Percentage calculations for all metrics

## Insights Generated

The system automatically generates insights such as:
- "🎯 Excellent average protocol score of 8.5/10 across 25 transcripts"
- "📈 Most common improvement area: Rapport Building (68% of cases)"
- "💪 Key strength across team: Patient-focused tone (85% of cases)"
- "⚠️ Below-average protocol score of 4.2/10 needs attention"

## Filtering Capabilities

The utilities support filtering by:
- Date range
- Location ID
- User ID
- Any custom criteria you define

This allows for focused analysis of specific time periods, locations, or individual performance tracking.

## Next Steps

1. Import the components into your existing dashboard pages
2. Add the filtering logic for your specific use case
3. Connect to your existing transcript data source
4. Customize the styling to match your application theme
5. Add additional insights or metrics as needed

The implementation is designed to be flexible and extensible while providing immediate value for sales performance analysis.