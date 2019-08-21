import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DroneRouteService } from '../services/drone-route.service';

@UseGuards(AuthGuard('jwt'))
@Controller('drone-route')
export class DroneRouteController {
  constructor(
    private readonly droneRouteService: DroneRouteService,
  ) {}

  @Post('create-incident-route')
  async createIncidentRoute(@Body() body) {
    return await this.droneRouteService.createIncidentRoutes(body.droneId, body.lon, body.lat);
  }
}