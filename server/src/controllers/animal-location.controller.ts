import { Controller, Get, Post, Query, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnimalLocationService } from '../services/animal-location.service';
import { AnimalLocation } from '../entity/animal-location.entity';
@Controller()
export class AnimalController {
  constructor(private readonly animalLocationService: AnimalLocationService) {}

  @Post('addAnimalLocationData')
  async addAnimalLocationData(@Body() body): Promise<boolean> {
    return await this.animalLocationService.addAnimalLocationData(
      body.animalId,
      body.date,
      body.lon,
      body.lat,
      body.animalSpecies,
      body.temp,
      body.habitat,
    );
  }

  @Post('csvUploader')
  @UseInterceptors(FileInterceptor('csvFile'))
  async csvUploader(@UploadedFile() file): Promise<boolean> {
    var fs = require('fs');
    const path = 'temp.csv';
    fs.writeFileSync(path,file.buffer);
    const isValid = await this.animalLocationService.validateAnimalCSV(path);
    return isValid;
  }

  @Post('addAnimalLocationDataCSV')
  async addAnimalLocationDataCSV(@Body() body): Promise<void> {
    return await this.animalLocationService.addAnimalLocationDataCSV(
      body.filename,
    );
  }

  @Post('getAllAnimalLocationTableData')
  async getAllAnimalLocationTableData(): Promise<boolean> {
    return await this.getAllAnimalLocationTableData();
  }

  @Post('getIndividualAnimalLocationTableData')
  async getIndividualAnimalLocationData(@Body() body): Promise<AnimalLocation[]> {
    return await this.animalLocationService.getIndividualAnimalLocationTableData(
      body.animalId,
    );
  }

  @Post('getSpeciesLocationTableData')
  async getSpeciesLocationTableData(@Body() body): Promise<AnimalLocation[]> {
    return await this.animalLocationService.getLocationDataBySpeciesId(
      body.animalSpecies,
    );
  }
}
