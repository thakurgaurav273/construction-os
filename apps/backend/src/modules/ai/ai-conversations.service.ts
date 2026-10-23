import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AiChatRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { Paginated } from '../projects/projects.service';
import { AiAnswer } from './ai.service';
import { AiConversationQueryDto } from './dto/ai-settings.dto';

const TITLE_LENGTH = 80;

/** Turns sent back to the model when a conversation continues; older ones are kept but not re-sent. */
const CONTEXT_TURNS = 12;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Who is looking: members see their own chats, `ai.history.view` holders see the whole organization's. */
export interface ConversationViewer {
  organizationId: string;
  userId: string;
  canViewAll: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  project: { id: string; name: string } | null;
  user: { id: string; name: string };
  isOwn: boolean;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  createdAt: Date;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface SaveTurnInput {
  organizationId: string;
  userId: string;
  projectId: string | null;
  conversationId?: string;
  question: string;
  askedAt: Date;
  answer: Pick<AiAnswer, 'text' | 'provider' | 'model'>;
}

const SUMMARY_INCLUDE = {
  user: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.AiConversationInclude;

type ConversationRow = Prisma.AiConversationGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

export function conversationTitle(question: string): string {
  const singleLine = question.replace(/\s+/g, ' ').trim();
  return singleLine.length > TITLE_LENGTH ? `${singleLine.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : singleLine;
}

function toSummary(row: ConversationRow, viewerId: string): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    project: row.project,
    user: row.user,
    isOwn: row.userId === viewerId,
    messageCount: row._count.messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTurnRole(role: AiChatRole): ChatTurn['role'] {
  return role === AiChatRole.USER ? 'user' : 'assistant';
}

@Injectable()
export class AiConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Earlier turns of a conversation the member is continuing. Only the author can add to a chat, and only
   * in the scope it started in, so a project chat can't be continued with organization-wide data.
   */
  async previousTurns(organizationId: string, userId: string, conversationId: string, projectId: string | null): Promise<ChatTurn[]> {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { userId: true, projectId: true },
    });
    if (!conversation || conversation.projectId !== projectId) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId) throw new ForbiddenException('You can only continue your own conversations. Start a new chat instead.');

    const recent = await this.prisma.aiChatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_TURNS,
      select: { role: true, content: true },
    });
    return recent.reverse().map((message) => ({ role: toTurnRole(message.role), content: message.content }));
  }

  /** Saved only after the model answers, so a failed call leaves no half-finished turn behind. */
  async saveTurn(input: SaveTurnInput): Promise<string> {
    const messages: Prisma.AiChatMessageCreateManyConversationInput[] = [
      { organizationId: input.organizationId, role: AiChatRole.USER, content: input.question, createdAt: input.askedAt },
      { organizationId: input.organizationId, role: AiChatRole.ASSISTANT, content: input.answer.text, provider: input.answer.provider, model: input.answer.model },
    ];

    if (input.conversationId) {
      await this.prisma.aiConversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date(), messages: { createMany: { data: messages } } },
      });
      return input.conversationId;
    }

    const conversation = await this.prisma.aiConversation.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        projectId: input.projectId,
        title: conversationTitle(input.question),
        messages: { createMany: { data: messages } },
      },
      select: { id: true },
    });
    return conversation.id;
  }

  async list(viewer: ConversationViewer, query: AiConversationQueryDto): Promise<Paginated<ConversationSummary>> {
    if (query.scope === 'organization' && !viewer.canViewAll) {
      throw new ForbiddenException('Your role doesn’t allow seeing everyone’s AI chat history. Ask an admin for access.');
    }

    const search = query.search?.trim();
    const where: Prisma.AiConversationWhereInput = {
      organizationId: viewer.organizationId,
      ...(query.scope === 'organization' ? {} : { userId: viewer.userId }),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return {
      items: rows.map((row) => toSummary(row, viewer.userId)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async get(viewer: ConversationViewer, conversationId: string): Promise<ConversationDetail> {
    const row = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        organizationId: viewer.organizationId,
        ...(viewer.canViewAll ? {} : { userId: viewer.userId }),
      },
      include: {
        ...SUMMARY_INCLUDE,
        messages: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, model: true, createdAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Conversation not found');

    return {
      ...toSummary(row, viewer.userId),
      messages: row.messages.map((message) => ({ ...message, role: toTurnRole(message.role) })),
    };
  }
}
