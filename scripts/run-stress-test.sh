#!/bin/bash

# Comprehensive stress test runner for the background processing system
# Tests 5000-sentence transcript to validate no timeouts occur

echo "🚀 Starting Background Processing Stress Test"
echo "=============================================="

# Check if server is running
echo "🔍 Checking if development server is running..."
if ! curl -s http://localhost:3000/api > /dev/null 2>&1; then
    echo "❌ Development server not running!"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo "✅ Development server is running"

# Check if required environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set in environment"
    echo "Please set your OpenAI API key: export OPENAI_API_KEY=your_key"
    exit 1
fi

echo "✅ OpenAI API key is configured"

# Run TypeScript compilation check
echo "🔧 Checking TypeScript compilation..."
npx tsc --noEmit --skipLibCheck

if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation errors detected"
    echo "Please fix compilation errors before running stress test"
    exit 1
fi

echo "✅ TypeScript compilation successful"

# Run the stress test
echo ""
echo "🎯 Executing 5000-sentence stress test..."
echo "This will test the complete background processing pipeline"
echo "Expected duration: 8-15 minutes"
echo ""

# Use ts-node to run the TypeScript test directly
npx ts-node test-scripts/stress-test.ts

# Capture exit code
EXIT_CODE=$?

echo ""
echo "=============================================="

if [ $EXIT_CODE -eq 0 ]; then
    echo "🎉 STRESS TEST PASSED SUCCESSFULLY!"
    echo "   • Background processing works flawlessly"
    echo "   • No timeouts or failures detected" 
    echo "   • System ready for large transcripts"
else
    echo "❌ STRESS TEST FAILED"
    echo "   • Check logs above for error details"
    echo "   • System may need further optimization"
fi

echo "=============================================="

exit $EXIT_CODE