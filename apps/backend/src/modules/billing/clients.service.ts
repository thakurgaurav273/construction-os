import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

export interface ClientView {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  gstNumber: string | null;
  address: string | null;
  contractCount: number;
  createdAt: Date;
}

type ClientWithCount = Client & { _count: { contracts: number } };

type ClientContactFields = Pick<Prisma.ClientUncheckedCreateInput, 'contactPerson' | 'email' | 'phone' | 'gstNumber' | 'address'>;

function toClientView(client: ClientWithCount): ClientView {
  return {
    id: client.id,
    name: client.name,
    contactPerson: client.contactPerson,
    email: client.email,
    phone: client.phone,
    gstNumber: client.gstNumber,
    address: client.address,
    contractCount: client._count.contracts,
    createdAt: client.createdAt,
  };
}

const WITH_COUNT = { _count: { select: { contracts: true } } } as const;

/** The people we bill on client contracts. Subcontractors are vendors and live in Procurement. */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<ClientView[]> {
    const clients = await this.prisma.client.findMany({ where: { organizationId }, include: WITH_COUNT, orderBy: { name: 'asc' } });
    return clients.map(toClientView);
  }

  async create(organizationId: string, userId: string, dto: CreateClientDto): Promise<ClientView> {
    try {
      const client = await this.prisma.client.create({
        data: { ...this.toData(dto), name: dto.name, organizationId, createdById: userId },
        include: WITH_COUNT,
      });
      return toClientView(client);
    } catch (error) {
      throw this.duplicateNameError(error, dto.name);
    }
  }

  async update(id: string, organizationId: string, dto: UpdateClientDto): Promise<ClientView> {
    await this.findClientOrThrow(id, organizationId);
    try {
      const client = await this.prisma.client.update({
        where: { id },
        data: { ...this.toData(dto), ...(dto.name !== undefined && { name: dto.name }) },
        include: WITH_COUNT,
      });
      return toClientView(client);
    } catch (error) {
      throw this.duplicateNameError(error, dto.name ?? '');
    }
  }

  async findClientOrThrow(id: string, organizationId: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({ where: { id, organizationId } });
    if (!client) throw new NotFoundException('Client not found.');
    return client;
  }

  /** Blank optional fields are stored as null rather than empty strings. */
  private toData(dto: UpdateClientDto): ClientContactFields {
    const optional = (value: string | null | undefined): string | null | undefined => (value === undefined ? undefined : value?.trim() || null);
    return {
      contactPerson: optional(dto.contactPerson),
      email: optional(dto.email),
      phone: optional(dto.phone),
      gstNumber: optional(dto.gstNumber),
      address: optional(dto.address),
    };
  }

  private duplicateNameError(error: unknown, name: string): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException(`A client named ${name} already exists.`);
    }
    return error;
  }
}
