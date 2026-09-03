import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
} from 'class-validator';

const BRANCH_ACCESS_MODES = [
  'ALL',
  'ASSIGNED',
] as const;

export class UpdateUserBranchAccessDto {
  @IsIn(BRANCH_ACCESS_MODES)
  branchAccessMode!: 'ALL' | 'ASSIGNED';

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  branchIds!: string[];
}
