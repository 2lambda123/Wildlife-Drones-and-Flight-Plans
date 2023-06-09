import { Injectable } from '@nestjs/common';
import { DatabaseService } from './db.service';
import { AnimalLocation } from '../entity/animal-location.entity';
import { CsvReaderService } from './csv-reader.service';
import { SRTMService } from './srtm.service';
import { Species } from '../entity/animal-species.entity';
import { MapService } from './map.service';
import { MapFeatureType } from '../entity/map-data.entity';
import { UserService } from './user.service';

@Injectable()
export class AnimalLocationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly csvReader: CsvReaderService,
    private readonly mapService: MapService,
    private readonly altitude: SRTMService,
    private readonly userService:UserService,
  ) {}

  async addAnimalLocationData(
    animalId: string,
    date: Date,
    lon: number,
    lat: number,
    animalSpecies: string,
    temp: number,
    habitat: string,
  ): Promise<boolean> {
    const con = await this.databaseService.getConnection();
    // let animalLocations = new AnimalLocation();

    const animalSpeciseType = await con
      .getRepository(Species)
      .findOne({ species: animalSpecies });

    if (!animalSpeciseType) {
      console.log('Species not found');
      return false;
    }
    console.time('feature searchers');
    const featureSearchers = this.mapService.getFeatureSearchSets();
    console.timeEnd('feature searchers');

   // console.timeEnd('get map data');

    const entryDate = new Date(date);
    try {
      const animalLocation = new AnimalLocation();
      animalLocation.animalId = animalId;
      animalLocation.latitude = lat;
      animalLocation.longitude = lon;
      animalLocation.timestamp = entryDate;
      animalLocation.temperature = temp;
      animalLocation.habitat = habitat;
      animalLocation.month = entryDate.getMonth() + 1;
      animalLocation.time = entryDate.getHours() * 60 + entryDate.getMinutes();
      animalLocation.species = animalSpeciseType;
      animalLocation.active = true;

      await this.calculateAnimalLocationDistances(animalLocation, lat, lon, featureSearchers);

      const addedAnimalLocation = await con
        .getRepository(AnimalLocation)
        .save(animalLocation);

      console.log(
        'Saved a new animal loction with id: ' + animalLocation.id,
      );

      return addedAnimalLocation != null;
    } catch (error) {
      console.log(error);
      console.log('animal location was not saved');
      return false;
    }
  }

  async validateAnimalCSV(filename): Promise<boolean>
  {
    const csvReader = this.csvReader.readCSV(filename);
    const headers = csvReader.getHeaders();
    let isValid = false;
    //Check if headers are valid if so then remove then populate table and remove headers
    if(headers.includes('event-id') && headers.includes('visible') && headers.includes('timestamp')
    && headers.includes('location-long')&& headers.includes('location-lat')&& headers.includes('external-temperature')
    && headers.includes('habitat')&& headers.includes('sensor-type')&& headers.includes('individual-taxon-canonical-name')
    && headers.includes('tag-local-identifier')&& headers.includes('individual-local-identifier')&& headers.includes('study-name')
    && headers.includes('species'))
    {
      isValid = true;
    }
    return isValid;
  }

  fileNameGenerator(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

  async addAnimalLocationDataCSV(filename): Promise<void> {
    const csvFile = filename;

    const conn = await this.databaseService.getConnection();
    const animalLocations = conn.getRepository(AnimalLocation);
    const animalSpeciesRepo = conn.getRepository(Species);

    console.time('feature searchers');
    const featureSearchers = await this.mapService.getFeatureSearchSets();
    console.timeEnd('feature searchers');

    //console.timeEnd('get map data');

    const csvReader = this.csvReader.readCSV(csvFile);

    let countInserted = 0;
    await this.userService.sendEmailToAllAdmins('CSV Upload in progress',
    'CSV upload has started!');
    let row = csvReader.next();
    while (typeof row !== 'undefined') {
      const lat = parseFloat(row['location-lat']);
      const lng = parseFloat(row['location-long']);

      const rowDate = new Date(row.timestamp);

      try {
        const location = new AnimalLocation();

        location.animalId = row['individual-local-identifier'];
        location.latitude = lat;
        location.longitude = lng;
        location.timestamp = rowDate;
        location.temperature = row['external-temperature'];
        location.habitat = row.habitat;
        location.month = rowDate.getMonth() + 1;
        location.time = rowDate.getHours() * 60 + rowDate.getMinutes();
        
        // find the species in the database for the row
        let species = await animalSpeciesRepo.findOne({
          where: { species: row['species'] },
        });

        // if the species does not exist, create it
        if (!species) {
          species = new Species();
          species.species = row['species'];
          await animalSpeciesRepo.save(species);
        }

        location.species = species;
        location.active = true;
        await this.calculateAnimalLocationDistances(location, lat, lng, featureSearchers);
        await animalLocations.save(location);
        console.log('inserted', ++countInserted);
      } catch (error) {
        console.error(error);
      }
      row = csvReader.next();
    }
    await this.userService.sendEmailToAllAdmins('CSV Upload Succesful',
      'CSV upload has completed succesfully!');
    //Delete the file
    var fs = require('fs');
    fs.unlink(filename, function (err) {
      if (err) throw err;
      // if no error, file has been deleted successfully
      console.log('File deleted!');
    });
  }

  private async calculateAnimalLocationDistances(location: AnimalLocation, lat, lng, featureSearchers) {
    const altitudeInfo = await this.altitude.getAltitudeForPoint(lat, lng);

    const damClosest = featureSearchers[MapFeatureType.dams].getNearest(lng, lat);
    const riverClosest = featureSearchers[MapFeatureType.rivers].getNearest(lng, lat);
    const roadsClosest = featureSearchers[MapFeatureType.roads].getNearest(lng, lat);
    const residentialClosest = featureSearchers[MapFeatureType.residential].getNearest(lng, lat);
    const intermittentWaterClosest = featureSearchers[MapFeatureType.intermittent].getNearest(lng, lat);

    const damDis = damClosest.distance || -Infinity;
    const riverDis = riverClosest.distance || -Infinity;
    const roadsDis = roadsClosest.distance || -Infinity;
    const residentialDis = residentialClosest.distance || -Infinity;
    const intermittentWaterDis = intermittentWaterClosest.distance || -Infinity;

    const damBearing = damClosest.getBearing();
    const riverBearing = riverClosest.getBearing();
    const roadsBearing = roadsClosest.getBearing();
    const residentialBearing = residentialClosest.getBearing();
    const intermittentWaterBearing = intermittentWaterClosest.getBearing();

    location.properties = {
      distanceToDams: damDis,
      bearingToDams: damBearing,
      distanceToRivers: riverDis,
      bearingToRivers: riverBearing,
      distanceToRoads: roadsDis,
      bearingToRoads: roadsBearing,
      distanceToResidences: residentialDis,
      bearingToResidences: residentialBearing,
      distanceToIntermittentWater: intermittentWaterDis,
      bearingToIntermittentWater: intermittentWaterBearing,

      altitude: altitudeInfo.averageAltitude,
      slopiness: altitudeInfo.variance,
    };
  }

  async getAllAnimalsLocationTableData(): Promise<AnimalLocation[]> {
    const con = await this.databaseService.getConnection();
    return await con.getRepository(AnimalLocation).find();
  }

  async getIndividualAnimalLocationTableData(animalID): Promise<AnimalLocation[]> {
    const con = await this.databaseService.getConnection();
    return await con.getRepository(AnimalLocation).find({ animalId: animalID });
  }

  async getLocationDataBySpeciesId(speciesId: number): Promise<AnimalLocation[]> {
    const con = await this.databaseService.getConnection();

    const species = await con.getRepository(Species).findOne(speciesId);

    if (!species) {
      console.error('Species does not exist');
      return undefined;
    }

    try {
      return await con
        .getRepository(AnimalLocation)
        .find({where: { species }});
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  async deactivateAnimal(animalId): Promise<Boolean> {
    const con = await this.databaseService.getConnection();

    const animal = await con
      .getRepository(AnimalLocation)
      .findOne({ id: animalId });

    try {
      animal.active = false;

      const addedAnimal = await con.getRepository(AnimalLocation).save(animal);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAnimalIds(): Promise<string[]> {
    const conn = await this.databaseService.getConnection();

    const locationsRepo = conn.getRepository(AnimalLocation);
    const res = await locationsRepo.createQueryBuilder()
      .select('DISTINCT "animalId"')
      .getRawMany();

    return res.map(e => e.animalId);
  }

  /**
   * Returns the last few animal locations for a given animal
   * IN CHRONOLOGICAL ORDER (latest position is last in array)
   * @param animalId The ID of the animal
   */
  async getLastFewAnimalLocations(animalId: string, numPositions = 10): Promise<Array<{
    speciesId: number;
    animalId: string;
    month: number;
    time: number;
    longitude: number;
    latitude: number;
    timestamp: Date;
  }>> {
    const conn = await this.databaseService.getConnection();

    const repo = conn.getRepository(AnimalLocation);
    const res = await repo.createQueryBuilder()
      .select('"speciesId", "animalId", month, time, longitude, latitude, timestamp')
      .where(`"animalId" = :animalId`, { animalId })
      .orderBy('timestamp', 'DESC')
      .limit(numPositions)
      .getRawMany();

    return res.map(el => ({
      speciesId: el.speciesId,
      animalId: el.animalId,
      month: el.month,
      time: el.time,
      longitude: el.longitude,
      latitude: el.latitude,
      timestamp: new Date(el.timestamp),
    })).reverse();
  }
}
