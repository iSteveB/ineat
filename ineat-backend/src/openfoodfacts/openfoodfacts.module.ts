import { Module } from '@nestjs/common';
import { OpenFoodFactsLocalRepository } from './openfoodfacts-local.repository';

@Module({
  providers: [OpenFoodFactsLocalRepository],
  exports: [OpenFoodFactsLocalRepository],
})
export class OpenFoodFactsModule {}
