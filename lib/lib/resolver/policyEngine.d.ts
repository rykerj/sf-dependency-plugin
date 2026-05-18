import { PolicyValue, PolicyMap } from '../../types/config';
/**
 * Determines the resolution policy for a given component type.
 * Falls back to DEFAULT_POLICIES if not explicitly configured.
 * Unknown component types default to 'exclude' to be safe.
 */
export declare function getPolicy(componentType: string, policies: PolicyMap): PolicyValue;
/**
 * Returns true if a namespace prefix indicates a managed package component.
 * Managed package components have a namespace prefix followed by __ in their API name.
 * Standard Salesforce namespaces (e.g. FinServ for FSC) are also detected.
 */
export declare function isManagedPackageComponent(apiName: string, componentType: string): boolean;
/**
 * Extracts the namespace prefix from a managed package component API name.
 */
export declare function extractNamespace(apiName: string): string;
//# sourceMappingURL=policyEngine.d.ts.map