import { Injectable } from '@nestjs/common';
import { Classifier } from './animal-classifier.service';
import { AnimalLocationService } from '../services/animal-location.service';
import { MapCellDataService } from '../services/map-cell-data.service';
import { SpeciesService } from '../services/species.service';
import { AnimalCellWeightService } from '../services/animal-cell-weight.service';
//  Need to fetch the data
//  Need to train the classifier with the data
//  Need to be able to get classification
//  Need to store trained classifier in memory

@Injectable()
export class ClassifierTraining {
    private classifier: any;
    constructor(private readonly animalLocationService: AnimalLocationService, private readonly mapCell: MapCellDataService
        ,       private readonly species: SpeciesService, private readonly animalCell: AnimalCellWeightService) {
    }

    //  Trains the model
    // Fetch data from database then train on that data
    async trainModel(speciesName) {
        //  fetch data by species name
        const data = await this.animalLocationService.getSpeciesLocationTableData(speciesName);

        const teachingData = JSON.parse(JSON.stringify(data)).map(animal => ({
            month: parseInt(animal.month),
            time: parseInt(animal.time),
            // temperature: parseInt(animal.temperature),
            distanceToRivers: parseFloat(animal.distanceToRivers),
            distanceToDams: parseFloat(animal.distanceToDams),
            distanceToRoads: parseFloat(animal.distanceToRoads),
            distanceToResidences: parseFloat(animal.distanceToResidences),
            distanceToIntermittentWater: parseFloat(animal.distanceToIntermittentWater),
            altitude: parseFloat(animal.altitude),
            slopiness: parseFloat(animal.slopiness),
        }));
        //  Populate classifier with teaching data
        this.classifier = new Classifier(teachingData);
        console.log('Done Training Classifier');
        //  Once classifier is done being taught we need to fetch all map cell data midpoints from the database.
        const result = await this.mapCell.getCellsData();
        const cellData = JSON.parse(JSON.stringify(result));
        const midPointClassification = [];
        const midPointCellID = [];
        const date = new Date();
        const month = date.getMonth() + 1;
        const currentHours = date.getHours();
        const currentMinutes = date.getMinutes();
        const time = (currentHours * 60) + currentMinutes;
        cellData.forEach(cell => {
            midPointClassification.push(
                {
                    month: month,
                    time: time, // plus 120
                    // temperature: parseInt(animal.temperature),
                    distanceToRivers: parseFloat(cell.distanceToRivers),
                    distanceToDams: parseFloat(cell.distanceToDams),
                    distanceToRoads: parseFloat(cell.distanceToRoads),
                    distanceToResidences: parseFloat(cell.distanceToResidences),
                    distanceToIntermittentWater: parseFloat(cell.distanceToIntermittentWater),
                    altitude: parseFloat(cell.altitude),
                    slopiness: parseFloat(cell.slopiness)
                }
            );
            midPointCellID.push(parseInt(cell.id));
        });
        //  Once all midpoints have been fetched we need we need to get a classification on each midpoint
        const classifications = this.getClassification(midPointClassification, midPointCellID);
        const speciesID = await this.species.getSpeciesID(speciesName);
        // Find min and max values
        let max = -Infinity;
        const min = 0;
        const weightedData = classifications.dataArray;
        weightedData.forEach(element => {
            if (element.weight > max) {
                max = element.weight;
            }
        });
        let newMax = -Infinity;
        // We need to normalise all the data so we can have percentages
        weightedData.forEach(element => {
            element.weight = this.normalize(min, max, element.weight);
            if (element.weight > newMax) {
                newMax = element.weight;
            }
            element.speciesId = speciesID;
        });
        // tslint:disable-next-line:prefer-const
        const toAdd = 1 - newMax;
        weightedData.forEach(element => {
            element.weight = element.weight + toAdd;
        });
        // add all weight to database
        const added = await this.animalCell.addAnimalCellsWeight(weightedData);
        return added;
    }
    private normalize(min, max, data) {
        // const delta = max - min;
        // const val = (data - min) / delta;
        return max - data;
    }

    // Need to call this method to get a classification
    private getClassification(data, dataID) {
        const dataArray = [];
        data.forEach((training, index) => {
            dataArray.push(
                {
                    cellId: dataID[index],
                    weight: this.classifier.getDistance(training),
                }
            );
        });
        return JSON.parse(
            JSON.stringify({
                dataArray,
            }),
        );
    }
}
