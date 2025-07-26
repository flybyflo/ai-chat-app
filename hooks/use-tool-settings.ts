'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export interface ToolSettings {
  integratedTools: Record<string, boolean>; // toolId -> enabled
  mcpServers: Record<string, boolean>;      // serverId -> enabled  
  mcpTools: Record<string, boolean>;        // `${serverId}:${toolName}` -> enabled
}

const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  integratedTools: {
    getWeather: true,
    createChart: true,
    createDocument: true,
    updateDocument: true,
    requestSuggestions: true,
  },
  mcpServers: {},
  mcpTools: {},
};

export function useToolSettings() {
  const [toolSettings, setToolSettings] = useLocalStorage<ToolSettings>(
    'tool-settings',
    DEFAULT_TOOL_SETTINGS
  );

  // Ensure all integrated tools have default values
  const normalizedSettings: ToolSettings = {
    integratedTools: {
      ...DEFAULT_TOOL_SETTINGS.integratedTools,
      ...toolSettings.integratedTools,
    },
    mcpServers: toolSettings.mcpServers || {},
    mcpTools: toolSettings.mcpTools || {},
  };

  const updateToolSettings = useCallback((newSettings: Partial<ToolSettings>) => {
    setToolSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, [setToolSettings]);

  // Helper functions for specific tool types
  const toggleIntegratedTool = useCallback((toolId: string) => {
    const currentState = normalizedSettings.integratedTools[toolId] ?? true;
    updateToolSettings({
      integratedTools: {
        ...normalizedSettings.integratedTools,
        [toolId]: !currentState,
      },
    });
  }, [normalizedSettings.integratedTools, updateToolSettings]);

  const toggleMcpServer = useCallback((serverId: string) => {
    const currentState = normalizedSettings.mcpServers[serverId] ?? true;
    const newServerState = !currentState;
    
    // When disabling a server, also disable all its tools
    let updatedMcpTools = { ...normalizedSettings.mcpTools };
    if (!newServerState) {
      // Disable all tools for this server
      Object.keys(updatedMcpTools).forEach(toolKey => {
        if (toolKey.startsWith(`${serverId}:`)) {
          updatedMcpTools[toolKey] = false;
        }
      });
    }

    updateToolSettings({
      mcpServers: {
        ...normalizedSettings.mcpServers,
        [serverId]: newServerState,
      },
      mcpTools: updatedMcpTools,
    });
  }, [normalizedSettings.mcpServers, normalizedSettings.mcpTools, updateToolSettings]);

  const toggleMcpTool = useCallback((serverId: string, toolName: string) => {
    const toolKey = `${serverId}:${toolName}`;
    const currentState = normalizedSettings.mcpTools[toolKey] ?? true;
    
    updateToolSettings({
      mcpTools: {
        ...normalizedSettings.mcpTools,
        [toolKey]: !currentState,
      },
    });
  }, [normalizedSettings.mcpTools, updateToolSettings]);

  const enableAllIntegratedTools = useCallback(() => {
    const allEnabled = Object.keys(DEFAULT_TOOL_SETTINGS.integratedTools).reduce(
      (acc, toolId) => ({ ...acc, [toolId]: true }),
      {}
    );
    updateToolSettings({
      integratedTools: {
        ...normalizedSettings.integratedTools,
        ...allEnabled,
      },
    });
  }, [normalizedSettings.integratedTools, updateToolSettings]);

  const disableAllIntegratedTools = useCallback(() => {
    const allDisabled = Object.keys(DEFAULT_TOOL_SETTINGS.integratedTools).reduce(
      (acc, toolId) => ({ ...acc, [toolId]: false }),
      {}
    );
    updateToolSettings({
      integratedTools: {
        ...normalizedSettings.integratedTools,
        ...allDisabled,
      },
    });
  }, [normalizedSettings.integratedTools, updateToolSettings]);

  const enableAllMcpServers = useCallback((serverIds: string[]) => {
    const allEnabled = serverIds.reduce(
      (acc, serverId) => ({ ...acc, [serverId]: true }),
      {}
    );
    updateToolSettings({
      mcpServers: {
        ...normalizedSettings.mcpServers,
        ...allEnabled,
      },
    });
  }, [normalizedSettings.mcpServers, updateToolSettings]);

  const disableAllMcpServers = useCallback((serverIds: string[]) => {
    const allDisabled = serverIds.reduce(
      (acc, serverId) => ({ ...acc, [serverId]: false }),
      {}
    );
    
    // Also disable all tools for these servers
    let updatedMcpTools = { ...normalizedSettings.mcpTools };
    serverIds.forEach(serverId => {
      Object.keys(updatedMcpTools).forEach(toolKey => {
        if (toolKey.startsWith(`${serverId}:`)) {
          updatedMcpTools[toolKey] = false;
        }
      });
    });

    updateToolSettings({
      mcpServers: {
        ...normalizedSettings.mcpServers,
        ...allDisabled,
      },
      mcpTools: updatedMcpTools,
    });
  }, [normalizedSettings.mcpServers, normalizedSettings.mcpTools, updateToolSettings]);

  const enableAllToolsForServer = useCallback((serverId: string, toolNames: string[]) => {
    const serverEnabled = { [serverId]: true };
    const toolsEnabled = toolNames.reduce(
      (acc, toolName) => ({ ...acc, [`${serverId}:${toolName}`]: true }),
      {}
    );

    updateToolSettings({
      mcpServers: {
        ...normalizedSettings.mcpServers,
        ...serverEnabled,
      },
      mcpTools: {
        ...normalizedSettings.mcpTools,
        ...toolsEnabled,
      },
    });
  }, [normalizedSettings.mcpServers, normalizedSettings.mcpTools, updateToolSettings]);

  const disableAllToolsForServer = useCallback((serverId: string, toolNames: string[]) => {
    const toolsDisabled = toolNames.reduce(
      (acc, toolName) => ({ ...acc, [`${serverId}:${toolName}`]: false }),
      {}
    );

    updateToolSettings({
      mcpTools: {
        ...normalizedSettings.mcpTools,
        ...toolsDisabled,
      },
    });
  }, [normalizedSettings.mcpTools, updateToolSettings]);

  // Helper functions to check tool states
  const isIntegratedToolEnabled = useCallback((toolId: string) => {
    return normalizedSettings.integratedTools[toolId] ?? true;
  }, [normalizedSettings.integratedTools]);

  const isMcpServerEnabled = useCallback((serverId: string) => {
    return normalizedSettings.mcpServers[serverId] ?? true;
  }, [normalizedSettings.mcpServers]);

  const isMcpToolEnabled = useCallback((serverId: string, toolName: string) => {
    const serverEnabled = isMcpServerEnabled(serverId);
    if (!serverEnabled) return false;
    
    const toolKey = `${serverId}:${toolName}`;
    return normalizedSettings.mcpTools[toolKey] ?? true;
  }, [normalizedSettings.mcpTools, isMcpServerEnabled]);

  // Get counts for UI display
  const getEnabledCounts = useCallback(() => {
    const integratedToolsEnabled = Object.values(normalizedSettings.integratedTools).filter(Boolean).length;
    const integratedToolsTotal = Object.keys(DEFAULT_TOOL_SETTINGS.integratedTools).length;
    
    const mcpServersEnabled = Object.values(normalizedSettings.mcpServers).filter(Boolean).length;
    const mcpServersTotal = Object.keys(normalizedSettings.mcpServers).length;

    return {
      integratedTools: { enabled: integratedToolsEnabled, total: integratedToolsTotal },
      mcpServers: { enabled: mcpServersEnabled, total: mcpServersTotal },
    };
  }, [normalizedSettings]);

  return {
    toolSettings: normalizedSettings,
    updateToolSettings,
    
    // Individual tool toggles
    toggleIntegratedTool,
    toggleMcpServer,
    toggleMcpTool,
    
    // Bulk actions
    enableAllIntegratedTools,
    disableAllIntegratedTools,
    enableAllMcpServers,
    disableAllMcpServers,
    enableAllToolsForServer,
    disableAllToolsForServer,
    
    // State checkers
    isIntegratedToolEnabled,
    isMcpServerEnabled,
    isMcpToolEnabled,
    
    // UI helpers
    getEnabledCounts,
  };
}