import { DeviceModel } from './deviceModel.js';
import { AssetType } from './enums.js';

/**
 * Validates if a child asset can be linked to a parent device based on the parent's model configuration.
 * The "Capability Matrix" defines which AssetTypes are allowed as children for a specific model.
 */
export function canLinkChild(parentModel: DeviceModel, childType: AssetType): boolean {
  if (!parentModel.allowedChildren) return false;
  return parentModel.allowedChildren.includes(childType);
}

/**
 * Validates a batch of links against the capability matrix.
 */
export function validateLinkBatch(
  parentModel: DeviceModel, 
  childrenTypes: AssetType[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const type of childrenTypes) {
    if (!canLinkChild(parentModel, type)) {
      errors.push(`Asset type '${type}' is not allowed for model '${parentModel.name}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
