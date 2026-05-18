"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolingApiResolver = exports.BUDGET_ABORT = exports.BUDGET_CONFIRM = exports.BUDGET_WARN = void 0;
// Budget thresholds as per spec Section 5.3.1
exports.BUDGET_WARN = 500;
exports.BUDGET_CONFIRM = 1000;
exports.BUDGET_ABORT = 2000;
class ToolingApiResolver {
    constructor(client, options) {
        this.client = client;
        this.queryCount = 0;
        this.onConfirmPrompt = options.onConfirmPrompt;
        this.onWarn = options.onWarn;
    }
    getQueryCount() {
        return this.queryCount;
    }
    /**
     * Fetches direct forward dependencies for a component from MetadataComponentDependency.
     * Handles budget thresholds: warn at 500, confirm at 1000, hard abort at 2000.
     */
    async getDependencies(componentName, componentType) {
        await this.checkBudget();
        const soql = `
      SELECT MetadataComponentId, MetadataComponentName, MetadataComponentType,
             RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentType
      FROM MetadataComponentDependency
      WHERE MetadataComponentName = '${componentName}'
      AND MetadataComponentType = '${componentType}'
    `.trim();
        this.queryCount++;
        const result = await this.client.query(soql);
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
    async resolvePackageName(namespace) {
        try {
            await this.checkBudget();
            const soql = `
        SELECT SubscriberPackage.Name, SubscriberPackage.NamespacePrefix
        FROM InstalledSubscriberPackage
        WHERE SubscriberPackage.NamespacePrefix = '${namespace}'
        LIMIT 1
      `.trim();
            this.queryCount++;
            const result = await this.client.query(soql);
            if (result.records.length > 0) {
                return result.records[0].SubscriberPackage.Name;
            }
        }
        catch {
            // Non-fatal — package name is nice to have but namespace alone is sufficient
        }
        return namespace; // fall back to namespace if lookup fails
    }
    async checkBudget() {
        if (this.queryCount >= exports.BUDGET_ABORT) {
            throw new Error(`Tooling API hard abort: ${this.queryCount} queries executed. ` +
                `Maximum is ${exports.BUDGET_ABORT}. Check for runaway recursion or reduce scope.`);
        }
        if (this.queryCount === exports.BUDGET_CONFIRM) {
            const proceed = await this.onConfirmPrompt(this.queryCount);
            if (!proceed) {
                throw new Error('Resolution aborted by user at Tooling API query budget limit.');
            }
        }
        if (this.queryCount === exports.BUDGET_WARN) {
            this.onWarn(`Warning: ${this.queryCount} Tooling API queries executed. ` +
                `Consider enabling useLocalSource: true to reduce API usage.`);
        }
    }
}
exports.ToolingApiResolver = ToolingApiResolver;
//# sourceMappingURL=toolingApi.js.map