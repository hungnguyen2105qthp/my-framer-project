# AudioURL Integration for Analytics

This document describes the integration of `audioURL` fields into the analytics collection.

## Overview

The analytics collection now includes `audioURL` fields that link to the original audio files from the transcript collection. This allows direct access to audio files when viewing analytics data.

## Changes Made

### 1. Analytics Data Structure

The `analyzeSingleTranscript` function now includes `audioURL` in the returned analytics data:

```typescript
return {
  documentId: transcript.id,
  transcriptName: transcript.name,
  userEmail: transcript.userEmail,
  timestamp: transcript.timestamp,
  audioURL: transcript.audioURL, // NEW: Added audioURL field
  totalPhrases: documentPhrases.length,
  phrasesByCategory: { ... },
  analysisTimestamp: new Date().toISOString(),
  categories: { ... }
}
```

### 2. Loading Logic

The analytics loading logic now uses `audioURL` from analytics data when building transcript data:

```typescript
transcriptsData.push({
  id: documentId,
  name: data.transcriptName || 'Untitled',
  transcript: '',
  timestamp: data.timestamp,
  emoji: '📝',
  notes: '',
  audioURL: data.audioURL || '', // NEW: Use audioURL from analytics
  userEmail: data.userEmail,
})
```

### 3. UI Display

The document details view now shows audio links when available:

```typescript
{selectedDocument.audioURL && (
  <p className="text-xs text-purple-600 mt-1">
    Audio: <a href={selectedDocument.audioURL} target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">Listen to Audio</a>
  </p>
)}
```

## Utility Functions

### `updateAnalyticsWithAudioURL()`

This function updates existing analytics documents with `audioURL` data from the transcript collection:

1. Fetches all transcript documents
2. Creates a map of document ID to audioURL
3. Updates analytics documents that are missing audioURL
4. Uses merge to preserve existing analytics data

### Usage

Click the "Update Analytics with AudioURL" button in the dashboard header to run the update process.

## Example AudioURL Format

```json
{
  "audioURL": "https://firebasestorage.googleapis.com:443/v0/b/descript-15fab.firebasestorage.app/o/audio%2F1741783795.m4a?alt=media&token=0459463d-71ef-4b2d-baef-c8c0f1990765"
}
```

## Benefits

1. **Direct Audio Access**: Users can listen to original audio while viewing analytics
2. **Data Consistency**: AudioURL is preserved in analytics collection
3. **User Experience**: Clickable audio links in the UI
4. **Backward Compatibility**: Existing analytics data is preserved during updates

## Future Enhancements

- Audio playback controls in the UI
- Audio timestamp linking to specific phrases
- Audio quality indicators
- Download functionality for audio files 