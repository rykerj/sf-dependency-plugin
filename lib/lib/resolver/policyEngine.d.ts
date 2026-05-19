import { PolicyValue, PolicyMap } from '../../types/config';
/**
 * Determines the resolution policy for a given component type.
 * Falls back to DEFAULT_POLICIES if not explicitly configured.
 * Unknown component types default to 'exclude' to be safe.
 */
export declare function getPolicy(componentType: string, policies: PolicyMap): PolicyValue;
/**
 * Returns true if a component appears to belong to a managed package.
 *
 * Examples:
 *   FinServ__FinancialAccount__c       -> true
 *   fflib__Application                 -> true
 *   MyObject__c                        -> false
 *   Account                            -> false
 *   MyObject__c.MyField__c             -> false
 *   ns__MyObject__c.ns__Field__c       -> true
 */
export declare function isManagedPackageComponent(apiName: string, componentType: string): boolean;
/**
 * Extracts the namespace prefix from a managed package component API name.
 */
export declare function extractNamespace(apiName: string): string;
//# sourceMappingURL=policyEngine.d.ts.map