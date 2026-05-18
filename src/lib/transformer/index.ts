import * as fs from 'fs';
import * as path from 'path';
import { PolicyMap } from '../../types/config';
import { DependencyGraph, GraphNode } from '../../types/graph';
import { transformObjectMetadata, TransformationLogEntry } from './objectTransformer';

export interface TransformResult {
  log: TransformationLogEntry[];
}

/**
 * Orchestrates Phase 3 transformation.
 * Walks the retrieved source directory and applies transformations
 * to metadata files based on the resolved graph and configured policies.
 */
export class Transformer {
  private log: TransformationLogEntry[] = [];

  constructor(
    private policies: PolicyMap,
    private graph: DependencyGraph
  ) {}

  /**
   * Transforms all metadata files in sourceDir and writes results to outputDir.
   */
  async transform(sourceDir: string, outputDir: string): Promise<TransformResult> {
    const resolvedComponents = this.buildResolvedComponentSet();
    const resolvedFields = this.buildResolvedFieldSet();

    fs.mkdirSync(outputDir, { recursive: true });
    this.copyAndTransform(sourceDir, outputDir, resolvedComponents, resolvedFields);

    return { log: this.log };
  }

  private copyAndTransform(
    srcDir: string,
    destDir: string,
    resolvedComponents: Set<string>,
    resolvedFields: Set<string>
  ): void {
    if (!fs.existsSync(srcDir)) return;

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyAndTransform(srcPath, destPath, resolvedComponents, resolvedFields);
      } else if (entry.name.endsWith('.object-meta.xml')) {
        // Apply object transformation
        const transformed = transformObjectMetadata(
          srcPath,
          this.policies,
          resolvedComponents,
          resolvedFields,
          this.log
        );
        fs.writeFileSync(destPath, transformed, 'utf-8');
      } else {
        // Copy all other files as-is
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Builds a set of "Type:ApiName" strings for all resolved (include/stub) components.
   * Used to check if a referenced component is in the manifest.
   */
  private buildResolvedComponentSet(): Set<string> {
    const set = new Set<string>();
    for (const node of this.graph.nodes.values()) {
      if (node.policy === 'include' || node.policy === 'stub') {
        set.add(node.id); // id is already "Type:ApiName"
      }
    }
    return set;
  }

  /**
   * Builds a set of "ObjectName.FieldName" strings for all resolved fields.
   * Used to scope listView columns and similar field references.
   */
  private buildResolvedFieldSet(): Set<string> {
    const set = new Set<string>();
    for (const node of this.graph.nodes.values()) {
      if (node.type === 'CustomField' && node.policy === 'include') {
        // CustomField apiName format is "ObjectName.FieldName" or just "FieldName__c"
        set.add(node.apiName);
      }
    }
    return set;
  }
}