import { TextDependency } from './textAnalyzer';

export interface ToolingApiClient {
  query<T>(soql: string): Promise<{ records: T[] }>;
}

export interface MetadataComponentDependencyRecord {
  MetadataComponentId: string;
  MetadataComponentName: string;
  MetadataComponentType: string;
  RefMetadataComponentId: string;
  RefMetadataComponentName: string;
  RefMetadataComponentType: string;
}

export interface InstalledPackageRecord {
  SubscriberPackage: {
    Name: string;
    NamespacePrefix: string;
  };
}

// Budget thresholds as per spec Section 5.3.1
export const BUDGET_WARN = 500;
export const BUDGET_CONFIRM = 1000;
export const BUDGET_ABORT = 2000;

export class ToolingApiResolver {
  private queryCount = 0;
  private onConfirmPrompt: (count: number) => Promise<boolean>;
  private onWarn: (message: string) => void;

  constructor(
    private client: ToolingApiClient,
    options: {
      onConfirmPrompt: (count: number) => Promise<boolean>;
      onWarn: (message: string) => void;
    }
  ) {
    this.onConfirmPrompt = options.onConfirmPrompt;
    this.onWarn = options.onWarn;
  }

  getQueryCount(): number {
    return this.queryCount;
  }

  /**
   * Fetches direct forward dependencies for a component from MetadataComponentDependency.
   * Handles budget thresholds: warn at 500, confirm at 1000, hard abort at 2000.
   */
  async getDependencies(
    componentName: string,
    componentType: string
  ): Promise<TextDependency[]> {
    await this.checkBudget();

    const soql = `
      SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType,
             RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType
      FROM MetadataComponentDependency
      WHERE MetadataComponentName = '${componentName}'
      AND MetadataComponentType = '${componentType}'
    `.trim();

    this.queryCount++;
    const result = await this.client.query<MetadataComponentDependencyRecord>(soql);

    return result.records.map((r) => ({
      type: r.RefMetadataComponentType,
      apiName: r.RefMetadataComponentName,
      referenceType: 'ToolingApi',
    }));
  }

  /**
   * Resolves a managed package name from its namespace prefix
   * using InstalledSubscriberPackage.
   */
  async resolvePackageName(namespace: string): Promise<string> {
    try {
      await this.checkBudget();
      const soql = `
        SELECT SubscriberPackage.Name, SubscriberPackage.NamespacePrefix
        FROM InstalledSubscriberPackage
        WHERE SubscriberPackage.NamespacePrefix = '${namespace}'
        LIMIT 1
      `.trim();

      this.queryCount++;
      const result = await this.client.query<InstalledPackageRecord>(soql);
      if (result.records.length > 0) {
        return result.records[0].SubscriberPackage.Name;
      }
    } catch {
      // Non-fatal — package name is nice to have but namespace alone is sufficient
    }
    return namespace; // fall back to namespace if lookup fails
  }

  private async checkBudget(): Promise<void> {
    if (this.queryCount >= BUDGET_ABORT) {
      throw new Error(
        `Tooling API hard abort: ${this.queryCount} queries executed. ` +
          `Maximum is ${BUDGET_ABORT}. Check for runaway recursion or reduce scope.`
      );
    }

    if (this.queryCount === BUDGET_CONFIRM) {
      const proceed = await this.onConfirmPrompt(this.queryCount);
      if (!proceed) {
        throw new Error('Resolution aborted by user at Tooling API query budget limit.');
      }
    }

    if (this.queryCount === BUDGET_WARN) {
      this.onWarn(
        `Warning: ${this.queryCount} Tooling API queries executed. ` +
          `Consider enabling useLocalSource: true to reduce API usage.`
      );
    }
  }
}