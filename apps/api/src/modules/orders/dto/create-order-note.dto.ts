import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderNoteDto {
  @IsIn(['INTERNAL', 'CUSTOMER'])
  visibility!: 'INTERNAL' | 'CUSTOMER';

  @IsString()
  @IsNotEmpty()
  content!: string;
}
