import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";

@Injectable()
export class ForgotPassword {
  constructor(private prisma: PrismaService) {}

  async execute(dto: any) {
    const { email } = dto;

    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) return { message: "If email exists, OTP sent" };

    // OTP logic later
    return { message: "OTP sent" };
  }
}