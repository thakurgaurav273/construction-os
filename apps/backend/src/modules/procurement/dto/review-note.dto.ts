import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_NOTE_LENGTH } from '../procurement.constants';

export class OptionalNoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) note?: string;
}

export class RequiredNoteDto {
  @ApiProperty({ description: 'Explains the decision to the requester' })
  @IsString()
  @IsNotEmpty({ message: 'Add a note explaining the decision' })
  @MaxLength(MAX_NOTE_LENGTH)
  note!: string;
}
