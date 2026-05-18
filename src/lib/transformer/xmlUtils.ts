import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name: string) => {
    // These elements can appear multiple times — always parse as arrays
    const multiValueElements = [
      'actionOverrides',
      'compactLayouts',
      'fields',
      'listViews',
      'recordTypes',
      'validationRules',
      'columns',
      'picklistValues',
      'layoutAssignments',
      'businessProcesses',
      'sharingReasons',
      'indexes',
      'searchLayouts',
    ];
    return multiValueElements.includes(name);
  },
};

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '    ',
  suppressEmptyNode: false,
};

export function parseXml(xmlContent: string): any {
  const parser = new XMLParser(PARSER_OPTIONS);
  return parser.parse(xmlContent);
}

export function buildXml(obj: any): string {
  const builder = new XMLBuilder(BUILDER_OPTIONS);
  const xml = builder.build(obj);
  // Ensure XML declaration is present
  if (!xml.startsWith('<?xml')) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }
  return xml;
}