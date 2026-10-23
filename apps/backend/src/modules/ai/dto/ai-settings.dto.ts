import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAccessRequestKind, AiProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max,
  IsUUID, MaxLength, Min, MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const CONVERSATION_SCOPES = ['mine', 'organization'] as const;
export type ConversationScope = (typeof CONVERSATION_SCOPES)[number];

/** Model ids look like "gemini-2.5-flash" or "meta-llama/Llama-3.1-8B-Instruct". */
const MODEL_PATTERN = /^[A-Za-z0-9._:/-]+$/;

export class SaveAiCredentialDto {
  @ApiProperty({ description: 'The provider API key. Sent once, stored encrypted, never returned.' })
  @IsString()
  @MinLength(10, { message: 'That doesn’t look like a complete API key' })
  @MaxLength(500)
  apiKey!: string;

  @ApiPropertyOptional({ description: 'Defaults to the provider’s recommended model' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(MODEL_PATTERN, { message: 'Enter a model id such as gemini-2.5-flash' })
  model?: string;
}

export class UpdateAiModelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(MODEL_PATTERN, { message: 'Enter a model id such as gemini-2.5-flash' })
  model!: string;
}

export class SelectAiProviderDto {
  @ApiProperty({ enum: AiProvider, nullable: true, description: 'null stops using own keys (falls back to any approved trial)' })
  @IsOptional()
  @IsEnum(AiProvider)
  provider!: AiProvider | null;
}

export class CreateAiAccessRequestDto {
  @ApiProperty({ enum: AiAccessRequestKind }) @IsEnum(AiAccessRequestKind) kind!: AiAccessRequestKind;

  @ApiPropertyOptional({ description: 'How many requests you need (top-ups only)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(10_000)
  requestedRequests?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class DecideAiAccessRequestDto {
  @ApiPropertyOptional({ description: 'Requests to grant; defaults to what was asked' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  grantedRequests?: number;

  @ApiPropertyOptional({ description: 'Days the grant lasts; defaults to 14' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RejectAiAccessRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Add a note explaining the decision' }) @MaxLength(1000) note!: string;
}

export class AiChatDto {
  @ApiProperty({ description: 'The new question; earlier turns are loaded from the saved conversation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;

  @ApiPropertyOptional({ description: 'Continue this conversation; omit to start a new one' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class AiConversationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CONVERSATION_SCOPES, default: 'mine', description: '"organization" needs the ai.history.view permission' })
  @IsOptional()
  @IsIn(CONVERSATION_SCOPES)
  scope?: ConversationScope;

  @ApiPropertyOptional({ description: 'Only chats about this project' }) @IsOptional() @IsUUID() projectId?: string;
}

export class SetDefaultPlatformProviderDto {
  @ApiProperty() @IsBoolean() isDefault!: boolean;
}
