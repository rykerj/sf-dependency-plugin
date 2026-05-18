"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXml = parseXml;
exports.buildXml = buildXml;
const fast_xml_parser_1 = require("fast-xml-parser");
const PARSER_OPTIONS = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => {
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
function parseXml(xmlContent) {
    const parser = new fast_xml_parser_1.XMLParser(PARSER_OPTIONS);
    return parser.parse(xmlContent);
}
function buildXml(obj) {
    const builder = new fast_xml_parser_1.XMLBuilder(BUILDER_OPTIONS);
    const xml = builder.build(obj);
    // Ensure XML declaration is present
    if (!xml.startsWith('<?xml')) {
        return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    }
    return xml;
}
//# sourceMappingURL=xmlUtils.js.map