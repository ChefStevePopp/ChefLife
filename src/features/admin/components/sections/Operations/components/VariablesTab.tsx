/**
 * VariablesTab - Operational Variables Tab Content
 * 
 * Wraps existing OperationsManager component for the tabbed Operations interface.
 * 
 * Note: The OperationsManager has its own header which creates some duplication.
 * This can be cleaned up in a future L5 polish pass by extracting the content
 * portion of OperationsManager into a separate component.
 * 
 * Location: Admin → Organization → Operations → Variables Tab
 */

import React from "react";
import { OperationsManager } from "../../OperationsManager";

export const VariablesTab: React.FC = () => {
  return <OperationsManager />;
};

export default VariablesTab;
