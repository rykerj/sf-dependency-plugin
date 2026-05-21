import * as fs from 'fs';
import * as path from 'path';
// Bundled via bundledDependencies in package.json — always present in the plugin
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApexParserFactory, ApexParserBaseVisitor } = require('@apexdevtools/apex-parser');

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface TextDependency {
  type: string;
  apiName: string;
  referenceType: string;
}

// ---------------------------------------------------------------------------
// Standard Salesforce objects — treated as object dependencies, not ApexClass
// ---------------------------------------------------------------------------
const STANDARD_OBJECTS = new Set([
  'Account', 'Contact', 'Lead', 'Opportunity', 'Case', 'Task', 'Event',
  'User', 'Group', 'Campaign', 'Asset', 'Contract', 'Order', 'OrderItem',
  'Pricebook2', 'PricebookEntry', 'Product2', 'Quote', 'QuoteLineItem',
  'Attachment', 'Note', 'FeedItem', 'FeedComment', 'ContentDocument',
  'ContentVersion', 'ContentDocumentLink', 'RecordType', 'PermissionSet',
  'PermissionSetAssignment', 'Profile', 'Territory', 'BusinessHours',
  'Holiday', 'SlaProcess', 'Entitlement', 'ServiceContract',
  'WorkOrder', 'WorkOrderLineItem', 'Idea', 'Solution', 'EmailMessage',
  'CaseComment', 'AccountContactRole', 'OpportunityContactRole',
  'CampaignMember',
]);

// ---------------------------------------------------------------------------
// System types — never emitted as class or object references
// Checked case-insensitively (Apex is case-insensitive)
// ---------------------------------------------------------------------------
const SYSTEM_TYPES_LOWER = new Set([
  // Primitives
  'string', 'integer', 'long', 'double', 'decimal', 'boolean',
  'date', 'datetime', 'time', 'blob', 'id', 'object', 'void',
  // Collections
  'list', 'set', 'map', 'iterable', 'iterator',
  // Core namespaces
  'system', 'database', 'schema', 'limits', 'math', 'json',
  'userinfo', 'apexpages', 'messaging', 'connectapi', 'eventbus',
  'crypto', 'encodingutil', 'url', 'label', 'type',
  // HTTP
  'http', 'httprequest', 'httpresponse',
  'restcontext', 'restrequest', 'restresponse',
  // Testing
  'test', 'assert',
  // SObject and exceptions
  'sobject', 'exception', 'apexexception', 'dmlexception',
  'queryexception', 'listexception', 'calloutexception',
  'noclassexception', 'nosuchmethodexception',
  // XML
  'xmlstreamreader', 'xmlstreamwriter',
  // Trigger / flow
  'flow', 'process', 'trigger', 'triggeroperation',
  // Reserved
  'null', 'true', 'false', 'this', 'super',
  // DML statement keywords (appear as identifiers in some contexts)
  'insert', 'update', 'delete', 'upsert', 'merge', 'undelete',
]);

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

type SymbolKind = 'ApexClass' | 'CustomObject' | 'StandardObject' | null;

function isSystemType(name: string): boolean {
  return SYSTEM_TYPES_LOWER.has(name.toLowerCase());
}

function isStandardObject(name: string): boolean {
  return STANDARD_OBJECTS.has(name);
}

function isCustomSuffix(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('__c')    ||
    lower.endsWith('__r')    ||
    lower.endsWith('__pc')   ||
    lower.endsWith('__mdt')  ||
    lower.endsWith('__e')    ||
    lower.endsWith('__b')    ||
    lower.endsWith('__x')    ||
    lower.endsWith('__kav')  ||
    lower.endsWith('__ka')   ||
    lower.endsWith('__share')   ||
    lower.endsWith('__history') ||
    lower.endsWith('__feed')
  );
}

function isCustomField(name: string): boolean {
  return /__(c|r|pc)$/i.test(name);
}

function classifySymbol(name: string): SymbolKind {
  if (!name || name.length === 0) return null;
  if (isSystemType(name)) return null;
  if (isCustomSuffix(name)) return 'CustomObject';
  if (isStandardObject(name)) return 'StandardObject';
  return 'ApexClass';
}

function deduplicateDeps(deps: TextDependency[]): TextDependency[] {
  const seen = new Set<string>();
  return deps.filter((d) => {
    const key = `${d.type}:${d.apiName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public: analyzeApexFile
//
// Parses an Apex .cls or .trigger file using @apexdevtools/apex-parser and
// walks the AST with a visitor to extract all dependency-relevant constructs.
//
// Requires: npm install @apexdevtools/apex-parser antlr4
// ---------------------------------------------------------------------------

export function analyzeApexFile(filePath: string): TextDependency[] {
  if (!fs.existsSync(filePath)) return [];

  const source = fs.readFileSync(filePath, 'utf-8');

  try {
    const isTrigger = filePath.endsWith('.trigger');
    const parser = ApexParserFactory.createParser(source);
    const tree = isTrigger ? parser.triggerUnit() : parser.compilationUnit();

    const visitor = buildVisitor(ApexParserBaseVisitor);
    visitor.visit(tree);

    return deduplicateDeps(visitor.deps);
  } catch (err: any) {
    // Parse errors in individual Apex files — warn and continue so one bad
    // file doesn't abort the entire resolution run
    console.warn(`[textAnalyzer] Parse error in ${filePath}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Visitor factory
//
// We use a factory function rather than a top-level class because
// ApexParserBaseVisitor is only available after the dynamic require.
// The factory creates a class that extends it at runtime.
//
// Context types below are annotated as `any` until the package is installed.
// After `npm install @apexdevtools/apex-parser`, replace `any` with the
// generated context types from:
//   node_modules/@apexdevtools/apex-parser/out/ApexParser.d.ts
//
// ANTLR4 naming conventions used here:
//   Grammar rule (camelCase) → visit method (visitPascalCase)
//   e.g.  classDeclaration       → visitClassDeclaration
//         localVariableDeclaration → visitLocalVariableDeclaration
//         soqlLiteral            → visitSoqlLiteral
//
//   Child rule access:     ctx.ruleName()        → single child
//                          ctx.ruleName()        → array when rule repeats
//   Token text access:     ctx.TOKEN().getText()
//   Full subtree text:     ctx.getText()
// ---------------------------------------------------------------------------

function buildVisitor(ApexParserBaseVisitor: any): any {

  class DependencyVisitor extends ApexParserBaseVisitor {
    // Collected dependency list — read by analyzeApexFile after visit
    deps: TextDependency[] = [];

    // Variable name → declared type map for field access resolution
    // e.g.  Account acc  →  'acc' → 'Account'
    private varTypes = new Map<string, string>();

    // -----------------------------------------------------------------------
    // Class declaration
    //
    // Grammar (BaseApexParser.g4):
    //   classDeclaration
    //     : CLASS id
    //       (EXTENDS typeRef)?
    //       (IMPLEMENTS typeList)?
    //       classBody ;
    //
    // ctx.typeRef()  → the extends type (one, if present)
    // ctx.typeList() → the implements list (if present)
    // -----------------------------------------------------------------------
    visitClassDeclaration(ctx: any): void {
      // extends
      const extendsTypeRef = this.childRule(ctx, 'typeRef');
      if (extendsTypeRef) {
        const name = this.typeRefName(extendsTypeRef);
        if (name && classifySymbol(name) === 'ApexClass') {
          this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Extends' });
        }
      }

      // implements — typeList holds comma-separated typeRefs
      const typeList = this.childRule(ctx, 'typeList');
      if (typeList) {
        for (const typeRef of this.childRules(typeList, 'typeRef')) {
          const name = this.typeRefName(typeRef);
          if (name && classifySymbol(name) === 'ApexClass') {
            this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Implements' });
          }
        }
      }

      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Variable / field declarations
    //
    // Grammar:
    //   localVariableDeclaration : modifier* typeRef variableDeclarators ;
    //   fieldDeclaration         : modifier* typeRef variableDeclarators SEMI ;
    //   variableDeclarators      : variableDeclarator (COMMA variableDeclarator)* ;
    //   variableDeclarator       : id (ASSIGN expression)? ;
    // -----------------------------------------------------------------------
    visitLocalVariableDeclaration(ctx: any): void {
      this.handleTypedDeclaration(ctx);
      this.visitChildren(ctx);
    }

    visitFieldDeclaration(ctx: any): void {
      this.handleTypedDeclaration(ctx);
      this.visitChildren(ctx);
    }

    private handleTypedDeclaration(ctx: any): void {
      const typeRef = this.childRule(ctx, 'typeRef');
      if (!typeRef) return;

      const typeName = this.typeRefName(typeRef);
      if (!typeName) return;

      const kind = classifySymbol(typeName);
      if (kind === 'ApexClass') {
        this.deps.push({ type: 'ApexClass', apiName: typeName, referenceType: 'TypeDeclaration' });
      } else if (kind === 'CustomObject') {
        this.deps.push({ type: 'CustomObject', apiName: typeName, referenceType: 'TypeDeclaration' });
      } else if (kind === 'StandardObject') {
        this.deps.push({ type: 'StandardObject', apiName: typeName, referenceType: 'TypeDeclaration' });
      }

      // Record variable → type for downstream field access resolution
      for (const decl of this.childRules(ctx, 'variableDeclarator')) {
        const idNode = this.childRule(decl, 'id');
        if (idNode) {
          this.varTypes.set(idNode.getText(), typeName);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Method declarations — return type
    //
    // Grammar:
    //   methodDeclaration
    //     : (VOID | typeRef) id formalParameters
    //       (THROWS qualifiedName)?
    //       (methodBody | SEMI) ;
    // -----------------------------------------------------------------------
    visitMethodDeclaration(ctx: any): void {
      const typeRef = this.childRule(ctx, 'typeRef');
      if (typeRef) {
        const name = this.typeRefName(typeRef);
        if (name) {
          const kind = classifySymbol(name);
          if (kind === 'ApexClass') {
            this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'ReturnType' });
          } else if (kind === 'CustomObject' || kind === 'StandardObject') {
            this.deps.push({ type: kind, apiName: name, referenceType: 'ReturnType' });
          }
        }
      }
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Formal parameters
    //
    // Grammar:
    //   formalParameter : modifier* typeRef variableDeclaratorId ;
    // -----------------------------------------------------------------------
    visitFormalParameter(ctx: any): void {
      const typeRef = this.childRule(ctx, 'typeRef');
      if (typeRef) {
        const name = this.typeRefName(typeRef);
        if (name) {
          const kind = classifySymbol(name);
          if (kind === 'ApexClass') {
            this.deps.push({ type: 'ApexClass', apiName: name, referenceType: 'Parameter' });
          } else if (kind === 'CustomObject' || kind === 'StandardObject') {
            this.deps.push({ type: kind, apiName: name, referenceType: 'Parameter' });
          }

          // Record parameter → type mapping
          const paramId = this.childRule(ctx, 'variableDeclaratorId') ||
                          this.childRule(ctx, 'id');
          if (paramId) {
            this.varTypes.set(paramId.getText(), name);
          }
        }
      }
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Object instantiation: new MyClass() / new Account() / new MyObj__c()
    //
    // Grammar:
    //   creator      : createdName (classCreatorRest | arrayCreatorRest | mapCreatorRest) ;
    //   createdName  : idCreatedNamePair (DOT idCreatedNamePair)* | primitiveType ;
    //   idCreatedNamePair : anyId (LT typeList GT)? ;
    // -----------------------------------------------------------------------
    visitCreator(ctx: any): void {
      const createdName = this.childRule(ctx, 'createdName');
      if (createdName) {
        const pairs = this.childRules(createdName, 'idCreatedNamePair');
        if (pairs.length > 0) {
          // First segment is the class/object name; subsequent are inner class paths
          const rawName = pairs[0].getText().split('<')[0]; // strip generics
          const kind = classifySymbol(rawName);
          if (kind) {
            this.deps.push({ type: kind, apiName: rawName, referenceType: 'Instantiation' });
          }
        }
      }
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Method calls on a receiver: MyClass.method() / instance.method()
    //
    // Grammar (simplified):
    //   expression
    //     : expression DOT methodCall      ← static / instance method call
    //     | expression DOT anyId           ← field/property access
    //     | primary                        ← standalone
    //     ...
    //
    // We intercept at the expression level via visitChildren propagation.
    // The dotMethodCall rule gives us the method name; we look at the
    // parent expression's first child for the receiver.
    // -----------------------------------------------------------------------
    visitDotMethodCall(ctx: any): void {
      // ctx.parentCtx is the expression that contains: receiver DOT methodCall
      // ctx.parentCtx.children[0] is the receiver expression
      try {
        const parentChildren = ctx.parentCtx?.children;
        if (parentChildren && parentChildren.length >= 3) {
          const receiverCtx = parentChildren[0];
          const rawReceiver = receiverCtx.getText();
          // Take the last segment of a dotted chain (e.g. "MyClass" from "this.MyClass")
          const receiverName = rawReceiver.split('.').pop() ?? rawReceiver;
          const kind = classifySymbol(receiverName);
          if (kind === 'ApexClass') {
            this.deps.push({
              type: 'ApexClass',
              apiName: receiverName,
              referenceType: 'StaticMethodCall',
            });
          }
        }
      } catch {
        // Non-fatal — continue
      }
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // SOQL — the grammar automatically parses inline SOQL
    //
    // Grammar:
    //   soqlLiteral : LBRACKET query RBRACKET ;
    //   query       : SELECT selectList FROM fromNameList
    //                 (USING SCOPE filterScope)?
    //                 (WHERE whereFields)?
    //                 ... ;
    //   fromNameList : fromName (COMMA fromName)* ;
    //   fromName     : fromId (AS? id)? ;
    //   fromId       : id (DOT id)? ;
    //   selectList   : selectEntry (COMMA selectEntry)* ;
    //   selectEntry  : soqlField | subQuery | typeOf ;
    //   soqlField    : soqlFieldName (DOT soqlFieldName)* ;
    //   soqlFieldName : anyId | COUNT ;
    // -----------------------------------------------------------------------
    visitQuery(ctx: any): void {
      // --- FROM objects
      const fromNameList = this.childRule(ctx, 'fromNameList');
      let firstFromObject: string | null = null;

      if (fromNameList) {
        for (const fromName of this.childRules(fromNameList, 'fromName')) {
          const fromId = this.childRule(fromName, 'fromId') || this.childRule(fromName, 'id');
          if (!fromId) continue;

          // fromId may be dotted (e.g. schema.Account) — take last segment
          const nameText = fromId.getText().split('.').pop() ?? fromId.getText();

          if (!firstFromObject) firstFromObject = nameText;

          const kind = classifySymbol(nameText);
          if (kind === 'CustomObject' || kind === 'StandardObject') {
            this.deps.push({ type: kind, apiName: nameText, referenceType: 'SoqlFrom' });
          }
        }
      }

      // --- SELECT fields (custom fields only)
      const selectList = this.childRule(ctx, 'selectList');
      if (selectList && firstFromObject) {
        for (const entry of this.childRules(selectList, 'selectEntry')) {
          const soqlField = this.childRule(entry, 'soqlField');
          if (!soqlField) continue;

          const fieldText = soqlField.getText();
          // fieldText may be dotted: Relation__r.FieldName__c
          const leafField = fieldText.split('.').pop() ?? fieldText;

          if (isCustomField(leafField)) {
            this.deps.push({
              type: 'CustomField',
              apiName: `${firstFromObject}.${leafField}`,
              referenceType: 'SoqlSelect',
            });
          }
        }
      }

      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Field and property access: receiver.MyField__c
    //
    // In the grammar, dot field access appears as:
    //   expression DOT anyId
    // We capture all custom field accesses and resolve the object via varTypes.
    // -----------------------------------------------------------------------
    visitFieldAccess(ctx: any): void {
      try {
        // ctx is the expression; getText() gives the full dotted text
        const text = ctx.getText();
        const lastDot = text.lastIndexOf('.');
        if (lastDot <= 0) {
          this.visitChildren(ctx);
          return;
        }
        const receiver = text.substring(0, lastDot);
        const fieldName = text.substring(lastDot + 1);

        if (isCustomField(fieldName)) {
          // Resolve variable to its declared type if possible
          const resolvedType = this.varTypes.get(receiver) ?? receiver;
          this.deps.push({
            type: 'CustomField',
            apiName: `${resolvedType}.${fieldName}`,
            referenceType: 'FieldAccess',
          });
        }
      } catch {
        // Non-fatal
      }
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Generic type parameters in collection literals
    // Catches: List<Account>, Set<MyObj__c>, Map<Id, Account>
    //
    // These are captured indirectly via visitLocalVariableDeclaration /
    // visitFieldDeclaration / visitFormalParameter → handleTypedDeclaration
    // because typeRef encompasses the full generic type.
    // We additionally override visitTypeRef to catch any remaining uses
    // (e.g. cast expressions, instanceof).
    // -----------------------------------------------------------------------
    visitTypeRef(ctx: any): void {
      // typeRef : typeName (LBRACKET RBRACKET)* ;
      // We handle this by extracting the base name and any generic type params
      // The base name is already captured by the declaration visitors above.
      // Here we just recurse to catch nested typeRefs (e.g. Map<Id, MyClass>)
      this.visitChildren(ctx);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * Gets a single named child rule from a context.
     * ANTLR4 generated contexts expose child rules as methods: ctx.ruleName()
     */
    private childRule(ctx: any, ruleName: string): any {
      try {
        const result = ctx[ruleName]?.();
        return result ?? null;
      } catch {
        return null;
      }
    }

    /**
     * Gets all instances of a named child rule.
     * When a grammar rule repeats, ANTLR4 returns an array from ctx.ruleName()
     */
    private childRules(ctx: any, ruleName: string): any[] {
      try {
        const result = ctx[ruleName]?.();
        if (Array.isArray(result)) return result;
        if (result) return [result];
        return [];
      } catch {
        return [];
      }
    }

    /**
     * Extracts the primary type name from a typeRef context.
     *
     * typeRef  : typeName (LBRACKET RBRACKET)* ;
     * typeName : LIST | SET | MAP | ... | id (DOT id)* ;
     *
     * Examples:
     *   "Account"          → "Account"
     *   "List<Account>"    → "List"   (handled by collection visitors)
     *   "Account[]"        → "Account"
     *   "MyClass.Inner"    → "MyClass"
     */
    private typeRefName(typeRef: any): string | null {
      try {
        const text: string = typeRef.getText();
        // Strip array notation and generic parameters, take first segment of dotted name
        return text.split('[')[0].split('<')[0].split('.')[0] || null;
      } catch {
        return null;
      }
    }
  }

  return new DependencyVisitor();
}

// ---------------------------------------------------------------------------
// File finder
// ---------------------------------------------------------------------------

export function findApexFile(
  componentName: string,
  sourceDir: string,
  extension: 'cls' | 'trigger'
): string | null {
  const classFile = `${componentName}.${extension}`;

  const directPath = path.join(
    sourceDir,
    extension === 'cls' ? 'classes' : 'triggers',
    classFile
  );
  if (fs.existsSync(directPath)) return directPath;

  return walkDir(sourceDir, (f) => path.basename(f) === classFile);
}

function walkDir(dir: string, predicate: (f: string) => boolean): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = walkDir(full, predicate);
      if (result) return result;
    } else if (predicate(full)) {
      return full;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Flow / ValidationRule XML analysis
// These remain regex-based — XML is not Apex and needs no AST parser
// ---------------------------------------------------------------------------

export function analyzeFlowFile(filePath: string): TextDependency[] {
  const deps: TextDependency[] = [];
  if (!fs.existsSync(filePath)) return deps;
  const source = fs.readFileSync(filePath, 'utf-8');
  let match: RegExpExecArray | null;

  const objectRegex = /<object>([\w]+(?:__c)?)<\/object>/g;
  while ((match = objectRegex.exec(source)) !== null) {
    deps.push({ type: 'CustomObject', apiName: match[1], referenceType: 'FlowObject' });
  }
  const fieldRegex = /<field>([\w]+__c)<\/field>/g;
  while ((match = fieldRegex.exec(source)) !== null) {
    deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'FlowField' });
  }
  return deduplicateDeps(deps);
}

export function analyzeValidationRuleFile(filePath: string): TextDependency[] {
  const deps: TextDependency[] = [];
  if (!fs.existsSync(filePath)) return deps;
  const source = fs.readFileSync(filePath, 'utf-8');
  let match: RegExpExecArray | null;

  const formulaFieldRegex = /\b([\w]+__c)\b/g;
  while ((match = formulaFieldRegex.exec(source)) !== null) {
    deps.push({ type: 'CustomField', apiName: match[1], referenceType: 'ValidationFormula' });
  }
  return deduplicateDeps(deps);
}