/**
 * RelationshipsTab - Food Relationships Tab Content
 * 
 * Wraps existing FoodRelationshipsManager component for the tabbed Operations interface.
 * 
 * Note: The FoodRelationshipsManager has its own header which creates some duplication.
 * This can be cleaned up in a future L5 polish pass by extracting the content
 * portion of FoodRelationshipsManager into a separate component.
 * 
 * Location: Admin → Organization → Operations → Food Relationships Tab
 */

import React from "react";
import { FoodRelationshipsManager } from "../../FoodRelationshipsManager";

export const RelationshipsTab: React.FC = () => {
  return <FoodRelationshipsManager />;
};

export default RelationshipsTab;
