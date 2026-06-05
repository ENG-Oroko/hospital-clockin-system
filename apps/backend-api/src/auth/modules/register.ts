import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/database.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class Register {
  constructor(private prisma: PrismaService) {}

  async execute(dto: any) {
    const {
      tenantId,
      departmentId,
      payrollNumber,
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      devicePin,
    } = dto;

    const exists = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: [
          { email },
          { payrollNumber },
          { devicePin },
        ],
      },
    });

    if (exists) {
      throw new ConflictException("User already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        departmentId,
        payrollNumber,
        firstName,
        lastName,
        email,
        phoneNumber,
        passwordHash,
        devicePin,
      },
    });

    return user;
  }
}