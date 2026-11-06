import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

// Standard fields import
import STREET_FIELD from '@salesforce/schema/Property__c.Address__c';
import CITY_FIELD from '@salesforce/schema/Property__c.City__c';
import STATE_FIELD from '@salesforce/schema/Property__c.State__c';
import POSTAL_CODE_FIELD from '@salesforce/schema/Property__c.Postal_Code__c';
import COUNTRY_FIELD from '@salesforce/schema/Property__c.Country__c';
import NAME_FIELD from '@salesforce/schema/Property__c.Name';

const FIELDS = [STREET_FIELD, CITY_FIELD, STATE_FIELD, POSTAL_CODE_FIELD, COUNTRY_FIELD, NAME_FIELD];

export default class PropertyMap extends LightningElement {
    @api recordId; // Auto-populated on record page
    mapMarkers = [];
    zoomLevel = 15;
    isLoaded = false;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredRecord({ error, data }) {
        if (data) {
            this.mapMarkers = [
                {
                    location: {
                        Street: data.fields.Address__c.value,
                        City: data.fields.City__c.value,
                        State: data.fields.State__c.value,
                        PostalCode: data.fields.Postal_Code__c.value,
                        Country: data.fields.Country__c.value
                    },
                    title: data.fields.Name.value,
                    description: 'Geocoded Property Location'
                }
            ];
            this.isLoaded = true;
        } else if (error) {
            console.error('Error loading map data', error);
        }
    }
}