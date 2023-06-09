import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { DatabaseService } from './db.service';
import { Species } from '../entity/animal-species.entity';

@Injectable()
export class SpeciesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async addSpecies(speciesType: string): Promise<boolean> {
    const con = await this.databaseService.getConnection();
    const species = new Species();

    species.species = speciesType;
    // tslint:disable-next-line:no-console
    const addedSpecies = await con.getRepository(Species).save(species);
    console.log('Saved a new animal species with id: ' + species.id);
    return addedSpecies != null;
  }

  async getSpeciesID(speciesType: string): Promise<number> {
    const con = await this.databaseService.getConnection();
    
    let specie = await con.getRepository(Species).findOne({species: speciesType});

    let id = specie.id;
    
    // tslint:disable-next-line:no-console
    if(id == undefined)
    {
      console.log('Species: '+ speciesType +' does not exits in the database.');
      return -1;
    }
   
    console.log('Animal id retrived: ' + id);
    return id;
  }

  async getSpecies(): Promise<Species[]> {
    const con = await this.databaseService.getConnection();

    return await con.getRepository(Species).find();
  }
}
