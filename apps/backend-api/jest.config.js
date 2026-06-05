// apps/backend-api/jest.config.js
module.exports = {
    moduleFileExtensions: ["js", "json", "ts"],
    rootDir: ".",
    testMatch: ["**/*.spec.ts"],
    transform: {
        "^.+\\.(t|j)s$": [
            "ts-jest",
            {
                tsconfig: {
                    module: "commonjs",
                    moduleResolution: "node",
                    esModuleInterop: true,
                    allowSyntheticDefaultImports: true,
                    isolatedModules: true,
                },
            },
        ],
    },
    collectCoverage: false,
    testEnvironment: "node",
    moduleNameMapper: {
        "^src/(.*)$": "<rootDir>/src/$1",
        "^@chronos/database$": "<rootDir>/../../packages/database/src",
        "^@chronos/database/(.*)$": "<rootDir>/../../packages/database/src/$1",
        "^@chronos/types-common$": "<rootDir>/../../packages/types-common/src",
        "^@chronos/types-common/(.*)$": "<rootDir>/../../packages/types-common/src/$1",
        // Add mappings for your services
        "^./services/notifications.service$": "<rootDir>/src/notifications/services/notifications.service.ts",
        "^./services/dispatcher.service$": "<rootDir>/src/notifications/services/dispatcher.service.ts",
        "^./services/preference.service$": "<rootDir>/src/notifications/services/preference.service.ts",
    },
    transformIgnorePatterns: ["node_modules/(?!(prisma-client|@chronos)/)"],
    preset: "ts-jest",
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    passWithNoTests: true,
};