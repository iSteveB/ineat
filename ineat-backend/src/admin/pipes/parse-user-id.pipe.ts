import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

@Injectable()
export class ParseUserIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!USER_ID_PATTERN.test(value)) {
      throw new BadRequestException('Identifiant utilisateur invalide');
    }

    return value;
  }
}
