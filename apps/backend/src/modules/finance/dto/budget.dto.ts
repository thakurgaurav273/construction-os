import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

/** ₹1 lakh crore; far above any one project, but keeps typos like an extra six zeros out. */
const MAX_ALLOCATION = 1_000_000_000_000;

export class CreateBudgetHeadDto {
  @ApiProperty({ example: 'Steel', description: 'Matched against purchase order and vendor bill categories' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Name the budget head, e.g. Steel or Electrical' })
  @MaxLength(60)
  category!: string;

  @ApiProperty({ example: 12000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the allocation in rupees' })
  @Min(0)
  @Max(MAX_ALLOCATION)
  allocated!: number;
}

export class UpdateBudgetHeadDto extends PartialType(CreateBudgetHeadDto) {}
