import { PrismaClient } from '@prisma/client';
declare global {
    interface typeofThis {
        prismaInstance?: PrismaClient;
    }
}
export declare const db: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, import("@prisma/client").Prisma.LogLevel, import("@prisma/client/runtime/library").DefaultArgs>;
