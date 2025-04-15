import React from 'react';
import DrawingCanvas from './DrawingCanvas';
import TradingDashboard from './trading/TradingDashboard';

// Constants for custom component IDs
export const COMPONENT_IDS = {
  CANVAS: 'canvas',
  TRADING_DASHBOARD: 'trading_dashboard',
};

// Disable ts check because we need to handle different types of component props
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

// Define component mapping
const componentMap: Record<string, AnyComponent> = {
  [COMPONENT_IDS.CANVAS]: DrawingCanvas,
  [COMPONENT_IDS.TRADING_DASHBOARD]: TradingDashboard,
};

/**
 * Render component based on component ID
 * @param componentId Component ID
 * @param props Component properties
 * @returns Rendered component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderExampleComponent = (componentId: string, props: any = {}) => {
  const Component = componentMap[componentId];
  
  if (!Component) {
    console.warn(`No component found for ID: ${componentId}`);
    return null;
  }
  
  // Log props being passed to component
  console.log(`[ExampleComponents] Rendering component ${componentId} with props:`, props);
  
  return <Component {...props} />;
};

export default componentMap; 