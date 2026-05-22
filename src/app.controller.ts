import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

// Simple interface to type-check our expected incoming payload
interface PaymentDto {
  amount: number;
  currency: string;
}

@Controller('process-payment')
export class PaymentController {
  @Post()
  @HttpCode(HttpStatus.CREATED) // Explicitly returns a 201 Created status code
  async processPayment(@Body() paymentDto: PaymentDto) {
    const { amount, currency } = paymentDto;

    // Simulate real-world payment processing delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return the exact structure specified in the acceptance criteria
    return {
      status: `Charged ${amount} ${currency}`,
    };
  }
}
