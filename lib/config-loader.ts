import fs from 'fs';
import path from 'path';

// Configuration interfaces
export interface ProcessingConfig {
  chains: Array<{
    chainId: string;
    locations: string[];
  }>;
  options: {
    saveResults: boolean;
    includeEmbeddings: boolean;
    maxConcurrent: number;
    delayBetweenProcessing: number;
  };
}

export interface OpenAISettings {
  model: string;
  temperature: number;
  embeddingModel: string;
  batchSize: number;
  embeddingBatchSize: number;
}

export interface ClusteringSettings {
  minClusterSize: number;
  similarityThreshold: number;
  method: string;
}

export interface DataSettings {
  minSentenceLength: number;
  maxResponseSize: number;
  sentenceBatchSize: number;
}

export interface ConversationProcessingConfig {
  processingConfig: ProcessingConfig;
  targetStages: string[];
  openaiSettings: OpenAISettings;
  clusteringSettings: ClusteringSettings;
  dataSettings: DataSettings;
}

// Default configuration fallback
const DEFAULT_CONFIG: ConversationProcessingConfig = {
  processingConfig: {
    chains: [
      {
        chainId: "Revive",
        locations: ["Carmel Valley"]
      }
    ],
    options: {
      saveResults: true,
      includeEmbeddings: false,
      maxConcurrent: 3,
      delayBetweenProcessing: 2000
    }
  },
  targetStages: [
    "Patient Interview & History",
    "Aesthetic Goals Discovery", 
    "Treatment Education & Knowledge",
    "Previous Experience Review",
    "Facial Assessment & Analysis",
    "Treatment Planning & Options",
    "Objection Handling & Concerns",
    "Closing & Treatment Commitment"
  ],
  openaiSettings: {
    model: "gpt-4",
    temperature: 0,
    embeddingModel: "text-embedding-3-small",
    batchSize: 10,
    embeddingBatchSize: 500
  },
  clusteringSettings: {
    minClusterSize: 5,
    similarityThreshold: 0.8,
    method: "cosine"
  },
  dataSettings: {
    minSentenceLength: 5,
    maxResponseSize: 1000,
    sentenceBatchSize: 500
  }
};

/**
 * Load configuration from JSON file
 */
export function loadConfig(): ConversationProcessingConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'conversation-processing.json');
    
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as ConversationProcessingConfig;
      
      // Validate required fields
      if (!config.processingConfig || !config.targetStages) {
        console.warn('Invalid config file, using defaults');
        return DEFAULT_CONFIG;
      }
      
      // Merge with defaults for any missing fields
      return {
        ...DEFAULT_CONFIG,
        ...config,
        processingConfig: {
          ...DEFAULT_CONFIG.processingConfig,
          ...config.processingConfig
        },
        openaiSettings: {
          ...DEFAULT_CONFIG.openaiSettings,
          ...config.openaiSettings
        },
        clusteringSettings: {
          ...DEFAULT_CONFIG.clusteringSettings,
          ...config.clusteringSettings
        },
        dataSettings: {
          ...DEFAULT_CONFIG.dataSettings,
          ...config.dataSettings
        }
      };
    } else {
      console.log('Config file not found, using defaults');
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to JSON file
 */
export function saveConfig(config: ConversationProcessingConfig): boolean {
  try {
    const configDir = path.join(process.cwd(), 'config');
    const configPath = path.join(configDir, 'conversation-processing.json');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('Configuration saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

/**
 * Get specific location configuration
 */
export function getLocationConfig(chainId: string, locationId: string): {
  found: boolean;
  chainConfig?: { chainId: string; locations: string[] };
} {
  const config = loadConfig();
  
  const chainConfig = config.processingConfig.chains.find(chain => 
    chain.chainId === chainId && chain.locations.includes(locationId)
  );
  
  return {
    found: !!chainConfig,
    chainConfig
  };
}

/**
 * Add a new location to the configuration
 */
export function addLocation(chainId: string, locationId: string): boolean {
  try {
    const config = loadConfig();
    
    // Find existing chain or create new one
    let chainConfig = config.processingConfig.chains.find(chain => chain.chainId === chainId);
    
    if (chainConfig) {
      // Add location if not already present
      if (!chainConfig.locations.includes(locationId)) {
        chainConfig.locations.push(locationId);
      }
    } else {
      // Create new chain configuration
      config.processingConfig.chains.push({
        chainId,
        locations: [locationId]
      });
    }
    
    return saveConfig(config);
  } catch (error) {
    console.error('Error adding location:', error);
    return false;
  }
}

/**
 * Remove a location from the configuration
 */
export function removeLocation(chainId: string, locationId: string): boolean {
  try {
    const config = loadConfig();
    
    const chainConfig = config.processingConfig.chains.find(chain => chain.chainId === chainId);
    
    if (chainConfig) {
      chainConfig.locations = chainConfig.locations.filter(loc => loc !== locationId);
      
      // Remove chain if no locations left
      if (chainConfig.locations.length === 0) {
        config.processingConfig.chains = config.processingConfig.chains.filter(
          chain => chain.chainId !== chainId
        );
      }
    }
    
    return saveConfig(config);
  } catch (error) {
    console.error('Error removing location:', error);
    return false;
  }
}

/**
 * Get all configured locations
 */
export function getAllLocations(): Array<{ chainId: string; locationId: string }> {
  const config = loadConfig();
  const locations: Array<{ chainId: string; locationId: string }> = [];
  
  config.processingConfig.chains.forEach(chain => {
    chain.locations.forEach(locationId => {
      locations.push({ chainId: chain.chainId, locationId });
    });
  });
  
  return locations;
}

// Export the config loader as default
export default loadConfig;