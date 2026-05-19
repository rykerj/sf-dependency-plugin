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
export function isManagedPackageComponent(
  apiName: string,
  componentType: string
): boolean {

  // -------------------------------------------------------------------
  // Handle fully-qualified field references separately
  // Example:
  //   MyObject__c.MyField__c
  //   ns__MyObject__c.ns__MyField__c
  // -------------------------------------------------------------------

  const fieldParts = apiName.split('.');

  // Analyze each segment independently
  for (const segment of fieldParts) {

    // Managed package naming:
    //   namespace__ComponentName
    //   namespace__Object__c
    //
    // Non-managed custom:
    //   MyObject__c
    //   MyField__c
    //
    // We only consider it managed if:
    //   - it STARTS with namespace__
    //   - AND contains another __ later
    //
    // Examples:
    //   FinServ__FinancialAccount__c
    //   fflib__Application
    //

    const managedPattern =
      /^[a-zA-Z][a-zA-Z0-9]*__[\w]+(?:__c|__mdt|__e|__b|__x|__kav)?$/;

    if (managedPattern.test(segment)) {

      // Exclude normal custom object names:
      //   MyObject__c
      //
      // which also technically match the pattern shape
      //
      // We require:
      //   namespace__Thing
      //
      // meaning TWO "__" occurrences minimum

      const underscoreCount =
        (segment.match(/__/g) || []).length;

      if (underscoreCount >= 2) {
        return true;
      }

      // Apex classes:
      //   fflib__Application
      //
      // only one "__"
      else if (
        (componentType === 'ApexClass' ||
         componentType === 'ApexTrigger') &&
        !segment.endsWith('__c')
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts the namespace prefix from a managed package component API name.
 */
export function extractNamespace(apiName: string): string {
  return apiName.split('__')[0];
}