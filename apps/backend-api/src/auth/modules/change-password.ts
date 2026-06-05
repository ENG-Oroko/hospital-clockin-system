import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class ChangePassword {
  constructor(private prisma: PrismaService) {}

  async execute(dto: any, user: any) {
    const { oldPassword, newPassword } = dto;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    const valid = await bcrypt.compare(
      oldPassword,
      dbUser.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException("Wrong password");
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { message: "Password updated successfully" };
  }
}