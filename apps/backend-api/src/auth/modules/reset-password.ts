import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class ResetPassword {
  constructor(private prisma: PrismaService) {}

  async execute(dto: any) {
    const { email, newPassword } = dto;

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    return { message: "Password reset successful" };
  }
}