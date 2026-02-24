"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
// Re-export everything from auth.ts to avoid duplication
// This file is kept for backward compatibility
var auth_1 = require("./auth");
Object.defineProperty(exports, "authorize", { enumerable: true, get: function () { return auth_1.authorizeRoles; } });
