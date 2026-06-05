import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";
import { TokenService } from "../services/token.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class Login {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  async execute(dto: any, req?: any) {
    const { tenantId, identifier, password } = dto;

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { email: identifier },
          { payrollNumber: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: req?.ip,
        userAgent: req?.headers?.["user-agent"],
        expiresAt: this.tokenService.refreshExpiry(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitize(user),
    };
  }

  private sanitize(user: any) {
    const { passwordHash, otpCode, passwordResetToken, ...safe } = user;
    return safe;
  }
}