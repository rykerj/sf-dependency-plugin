"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
class World extends core_1.Command {
    async run() {
        this.log('hello world! (./src/commands/hello/world.ts)');
    }
}
World.args = {};
World.description = 'Say hello world';
World.examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
];
World.flags = {};
exports.default = World;
//# sourceMappingURL=world.js.map