import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IdempotencyInterceptor } from './common/interceptors/idempotency/idempotency.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bind our Pay-Once processing layer across the whole application
  app.useGlobalInterceptors(new IdempotencyInterceptor());

  await app.listen(process.env.PORT ?? 3000);
  console.log('🚀 IgirePay Gateway running safely on http://localhost:3000');
}
bootstrap();
