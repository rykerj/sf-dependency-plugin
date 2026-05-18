import { PolicyValue, PolicyMap, DEFAULT_POLICIES } from '../../types/config';

/**
 * Determines the resolution policy for a given component type.
 * Falls back to DEFAULT_POLICIES if not explicitly configured.
 * Unknown component types default to 'exclude' to be safe.
 */
export function getPolicy(componentType: string, policies: PolicyMap): PolicyValue {
  const configured = policies[componentType];
  if (configured) return configured;

  const defaultPolicy = DEFAULT_POLICIES[componentType];
  if (defaultPolicy) return defaultPolicy;

  // Unknown types: exclude by default — safer than accidentally pulling in unknown metadata
  return 'exclude';
}

/**
 * Returns true if a namespace prefix indicates a managed package component.
 * Managed package components have a namespace prefix followed by __ in their API name.
 * Standard Salesforce namespaces (e.g. FinServ for FSC) are also detected.
 */
export function isManagedPackageComponent(apiName: string, componentType: string): boolean {
  // Custom fields and objects use __ suffix for custom, but managed ones have namespace__ComponentName__c
  // A managed package component will have exactly two __ segments in its name
  const parts = apiName.split('__');

  // Standard components: no __ at all (e.g. Account, Contact)
  // Custom components: one __ segment (e.g. MyObject__c, MyField__c)
  // Managed components: two __ segments (e.g. FinServ__FinancialAccount__c, fflib__Application)
  if (parts.length >= 3) return true;

  // Apex classes from managed packages also follow namespace__ClassName pattern
  if (componentType === 'ApexClass' || componentType === 'ApexTrigger') {
    if (parts.length === 2 && !apiName.endsWith('__c')) return true;
  }

  return false;
}

/**
 * Extracts the namespace prefix from a managed package component API name.
 */
export function extractNamespace(apiName: string): string {
  return apiName.split('__')[0];
}