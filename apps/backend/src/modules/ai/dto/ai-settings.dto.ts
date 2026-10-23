import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAccessRequestKind, AiProvider } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max,
  MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

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

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] }) @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(4000) content!: string;
}

export class AiChatDto {
  @ApiProperty({ type: [ChatMessageDto], description: 'The conversation so far, oldest first; the last one is the question' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}

export class SetDefaultPlatformProviderDto {
  @ApiProperty() @IsBoolean() isDefault!: boolean;
}
