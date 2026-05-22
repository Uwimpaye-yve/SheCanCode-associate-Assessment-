import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController], // <-- Make sure PaymentController is listed here!
})
export class PaymentModule {}
