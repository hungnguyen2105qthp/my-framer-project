# Conversation Analytics System

A comprehensive AI-powered conversation analysis system that processes transcripts through stage classification, sentence segmentation, embedding generation, and clustering to surface common themes and patterns.

## Overview

This system implements the conversation processing pipeline described in your requirements:

1. **Load & Pre-Filter**: Read transcript data and classify into target stages using OpenAI
2. **Sentence Segmentation**: Split transcript turns into individual sentences
3. **Embeddings & Clustering**: Generate embeddings and cluster sentences by stage to identify themes
4. **Aggregate & Visualize**: Create dashboard metrics and visualizations

## Target Stages

The system analyzes conversations across these 7 key stages:

- Patient Interview & History
- Aesthetic Goals Discovery
- Treatment Education & Knowledge
- Previous Experience Review
- Facial Assessment & Analysis
- Treatment Planning & Options
- Objection Handling & Concerns
- Closing & Treatment Commitment

## Architecture

### Core Files

- `lib/conversation-analyzer.ts` - Main processing engine
- `lib/conversation-batch-processor.ts` - Batch processing utilities
- `lib/config-loader.ts` - Configuration management
- `components/conversation-analytics-dashboard.tsx` - UI dashboard component

### API Endpoints

- `/api/process-conversations` - Process individual locations
- `/api/batch-process-conversations` - Batch process multiple locations
- `/api/conversation-config` - Manage processing configuration

### Configuration

- `config/conversation-processing.json` - Main configuration file

## Data Structure

The system expects Firebase data structured as:

```
/locations/{chainId}/{locationId}/{documentId}
  - transcript: string
  - speakerTranscript: Array<{speaker: string, text: string}>
  - timestamp: Date
  - other fields...
```

## Setup

### Prerequisites

1. Firebase Admin SDK configured
2. OpenAI API key set in environment variables
3. Next.js application with required dependencies

### Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### Configuration

Edit `config/conversation-processing.json` to specify which locations to process:

```json
{
  "processingConfig": {
    "chains": [
      {
        "chainId": "Revive",
        "locations": ["Carmel Valley"]
      }
    ],
    "options": {
      "saveResults": true,
      "includeEmbeddings": false,
      "maxConcurrent": 3,
      "delayBetweenProcessing": 2000
    }
  }
}
```

## Usage

### 1. Single Location Processing

```typescript
import { processConversations } from '@/lib/conversation-analyzer';

const { processedSentences, summary } = await processConversations('Revive', 'Carmel Valley');
```

### 2. Batch Processing

```typescript
import { batchProcessConversations } from '@/lib/conversation-batch-processor';

const results = await batchProcessConversations(config);
```

### 3. API Usage

```bash
# Process single location
curl -X POST /api/process-conversations \\
  -H "Content-Type: application/json" \\
  -d '{"chainId": "Revive", "locationId": "Carmel Valley"}'

# Start batch processing
curl -X POST /api/batch-process-conversations \\
  -H "Content-Type: application/json" \\
  -d '{"action": "process"}'

# Check processing status
curl /api/batch-process-conversations?action=status
```

### 4. Dashboard Usage

Add the dashboard component to any page:

```tsx
import { ConversationAnalyticsDashboard } from '@/components/conversation-analytics-dashboard';

export default function AnalyticsPage() {
  return <ConversationAnalyticsDashboard />;
}
```

## Processing Pipeline Details

### Stage Classification

- Uses OpenAI GPT-4 to classify conversation turns
- Processes in batches of 10 for efficiency
- Filters to only include target stages
- Includes confidence scoring

### Sentence Segmentation

- JavaScript-based sentence splitting (alternative to SpaCy)
- Filters out fragments shorter than 5 characters
- Preserves speaker and stage information

### Embedding & Clustering

- OpenAI text-embedding-3-small for embeddings
- Processes in batches of 500 sentences
- Clusters within each stage separately
- Uses cosine similarity clustering (min cluster size: 5)

### Results Storage

Processing results are saved to Firebase:

```
/conversationAnalysis/{chainId}/{locationId}/
  - summary: Processing summary and metadata
  - dashboardMetrics: Aggregated metrics for visualization
  - sentences_batch_0: Processed sentences (batched)
  - sentences_batch_1: Additional sentence batches...
```

## Dashboard Features

### Overview Tab
- Processing status across all locations
- Target stages display
- Configuration overview

### Locations Tab
- Processing status for each location
- Ability to view processed results
- Processing timestamps

### Analytics Tab
- Stage clustering visualizations
- Cluster distribution charts
- Detailed metrics tables
- Rep-level breakdowns

### Results Tab
- Latest processing results
- Performance metrics
- Error tracking

## Configuration Management

### Add New Location

```bash
curl -X POST /api/conversation-config \\
  -H "Content-Type: application/json" \\
  -d '{"action": "add-location", "chainId": "Revive", "locationId": "New Location"}'
```

### Update Settings

```bash
curl -X POST /api/conversation-config \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "update-settings",
    "openaiSettings": {
      "model": "gpt-4",
      "temperature": 0
    }
  }'
```

## Monitoring & Troubleshooting

### Logs

The system provides detailed logging:
- Processing progress for each location
- OpenAI API call results
- Clustering performance
- Error details

### Common Issues

1. **OpenAI Rate Limits**: Adjust `delayBetweenProcessing` and `maxConcurrent`
2. **Large Datasets**: Enable result saving and process in smaller batches
3. **Clustering Issues**: Adjust `minClusterSize` and `similarityThreshold`

## Performance Considerations

- **Rate Limits**: OpenAI API limits handled with batching and delays
- **Memory Usage**: Large embeddings excluded from storage by default
- **Processing Time**: ~2-5 seconds per conversation depending on length
- **Storage**: Results partitioned by location for efficient queries

## Extending the System

### Adding New Stages

1. Update `targetStages` in configuration
2. The system will automatically process new stages

### Custom Clustering

Modify the clustering algorithm in `conversation-analyzer.ts`:

```typescript
// Replace simpleClustering function with your preferred method
function customClustering(embeddings: number[][]): number[] {
  // Your clustering implementation
}
```

### Additional Metrics

Add custom metrics in `generateDashboardMetrics()`:

```typescript
// Calculate custom metrics from processed sentences
const customMetrics = processedSentences.map(sentence => {
  // Your metric calculation
});
```

## API Reference

### POST /api/process-conversations

Process conversations for a specific location.

**Body:**
```json
{
  "chainId": "string",
  "locationId": "string",
  "options": {
    "saveResults": boolean,
    "includeFullData": boolean
  }
}
```

### POST /api/batch-process-conversations

Batch process multiple locations or manage processing.

**Body:**
```json
{
  "action": "process" | "status" | "load",
  "config": ProcessingConfig,
  "chainId": "string", // for load action
  "locationId": "string" // for load action
}
```

### GET/POST /api/conversation-config

Manage processing configuration.

**Actions:**
- `get`: Retrieve current configuration
- `save`: Save new configuration
- `add-location`: Add location to processing
- `remove-location`: Remove location
- `update-settings`: Update specific settings

## License

This system is part of the WispDashboard project.