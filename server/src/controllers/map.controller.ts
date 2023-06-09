import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { MapService } from '../services/map.service';
import { MapFeatureType } from '../entity/map-data.entity';

@Controller('map')
@UseGuards(AuthGuard('jwt'))
export class MapController {
  constructor(
    private mapService: MapService,
  ) {}

  @Post('find-reserves')
  async findReserves(
    @Body('top') top,
    @Body('left') left,
    @Body('bottom') bottom,
    @Body('right') right,
  ) {
    // tslint:disable-next-line:no-console
    console.log(left, bottom, right, top);
    return await this.mapService.findReservesInArea(
      left,
      bottom,
      right,
      top,
    );
  }

  @Post('update')
  async update() {
    return await this.mapService.updateMap();
  }

  @Post('reserve')
  async getReserve() {
    return await this.mapService.getMapFeature(MapFeatureType.reserve);
  }

  @Post('getMapCells')
  getMapCells() {
    console.log('calling');
    return this.mapService.getMapCells();
  }

  @Post('getSpeciesWeightDataForTime')
  async getSpeciesWeightDataForTime(@Body() body) {
    console.log('calling');
    return await this.mapService.getSpeciesWeightDataForTime(
      body.species,
      body.time,
    );
  }

  @Post('getCellPoachingWeight')
  async getCellPoachingWeight() {
    console.log('calling');
    return await this.mapService.getCellPoachingWeight();
  }

  /**
   * Gets the size of a map cell from the database
   */
  @Post('getCellSize')
  async getCellSize(): Promise<number> {
    return await this.mapService.getCellSize();
  }

  @Post('getCellHotspots')
  async getCellHotspots(@Body() body): Promise<Array<{
    lon: number;
    lat: number;
    cellId: number;
    weight: number;
  }>> {
    return await this.mapService.getCellHotspots(body.time);
  }
}
