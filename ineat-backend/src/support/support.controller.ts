import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { SupportService } from './support.service';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(SessionAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer un message au support InEat' })
  @ApiResponse({ status: 200, description: 'Message envoyé' })
  @ApiResponse({ status: 400, description: 'Message invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 429, description: "Limite d'envoi atteinte" })
  sendMessage(
    @Request() request: RequestWithUser,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportService.sendMessage(request.user, dto);
  }
}
