import { Injectable } from '@nestjs/common';
import { createConnection, Connection } from 'typeorm';
import { User } from '../entity/user.entity';
import { AnimalLocation } from '../entity/animal-location.entity';
import { AnimalInterestPoint } from '../entity/animal-interest-point.entity';
import { Ranger } from '../entity/ranger.entity';
import { PoachingIncident } from '../entity/poaching-incident.entity';
import { PoachingIncidentType } from '../entity/poaching-incident-type.entity';
import { MapData } from '../entity/map-data.entity';
import { ReserveConfiguration } from '../entity/reserve-configuration.entity';
import { ModelData } from '../entity/model.entity';
import { Species } from '../entity/animal-species.entity';

@Injectable()
export class DatabaseService {
  private connection: Connection;
  private readyListeners = [];
  private isInitialising = false;

  /**
   * Usage:
   * const users = (await new DatabaseService().getConnection()).getRepository(User);
   */
  getConnection(): Promise<Connection> {
    return new Promise(async resolve => {
      if (this.connection) {
        return resolve(this.connection);
      }

      this.readyListeners.push(resolve);
      if (this.isInitialising) {
        return;
      }
      this.isInitialising = true;

      this.connection = await createConnection({
        type: 'sqlite',
        database: 'database.sqlite',
        entities: [
          User,
          AnimalLocation,
          AnimalInterestPoint,
          MapData,
          ReserveConfiguration,
          PoachingIncident,
          PoachingIncidentType,
          Ranger,
          ModelData,
          Species,
        ],
        synchronize: true,
        logging: false,
      });

      while (this.readyListeners.length) {
        this.readyListeners[0](this.connection);
        this.readyListeners.shift();
      }
    });
  }
}
