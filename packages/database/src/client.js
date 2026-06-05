"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const localGlobal = globalThis;
exports.db = localGlobal.prismaInstance || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
});
if (process.env.NODE_ENV !== 'production') {
    localGlobal.prismaInstance = exports.db;
}
//# sourceMappingURL=client.js.map