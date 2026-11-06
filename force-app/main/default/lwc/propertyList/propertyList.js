import { LightningElement, track } from 'lwc';
import getProperties from '@salesforce/apex/PropertyController.getProperties';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const COLUMNS = [
    { label: 'Property Name', fieldName: 'Name' },
    { label: 'Type', fieldName: 'Type__c' },
    { label: 'Status', fieldName: 'Status__c' },
    { label: 'Furnishing', fieldName: 'Furnishing_Status__c' },
    { label: 'Rent', fieldName: 'Rent__c', type: 'currency' }
];

export default class PropertyList extends LightningElement {
    columns = COLUMNS;
    @track properties = [];
    @track filters = {
        maxPrice: null,
        availabilityStatus: '',
        furnishingStatus: '',
        maxDistanceKm: null,
        userLat: null,
        userLng: null
    };
    
    pageNumber = 1;
    pageSize = 25; // As per requirement
    totalRecords = 0;
    isLoading = false;

    statusOptions = [
        { label: 'None', value: '' },
        { label: 'Occupied', value: 'Occupied' },
        { label: 'Available', value: 'Available' }
    ];

    furnishOptions = [
        { label: 'None', value: '' },
        { label: 'Furnished', value: 'Furnished' },
        { label: 'Semi-Furnished', value: 'Semi-Furnished' },
        { label: 'Unfurnished', value: 'Unfurnished' }
    ];

    connectedCallback() {
        this.fetchProperties();
    }

    handleFilterChange(event) {
        const field = event.target.dataset.id;
        this.filters[field] = event.target.value;
    }

    applyFilters() {
        this.pageNumber = 1; // Reset to page 1 on new filter
        this.isLoading = true;

        if (this.filters.maxDistanceKm && this.filters.maxDistanceKm > 0) {
            // Fetch User's Location via Browser API
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.filters.userLat = position.coords.latitude;
                        this.filters.userLng = position.coords.longitude;
                        this.fetchProperties();
                    },
                    (error) => {
                        this.showToast('Location Error', 'Please allow location access to filter by distance.', 'error');
                        this.isLoading = false;
                    }
                );
            } else {
                this.showToast('Error', 'Browser does not support Geolocation.', 'error');
                this.isLoading = false;
            }
        } else {
            // Nullify location if distance filter is empty
            this.filters.userLat = null;
            this.filters.userLng = null;
            this.fetchProperties();
        }
    }

    fetchProperties() {
        this.isLoading = true;
        
        getProperties({ filtersJSON: JSON.stringify(this.filters), pageNumber: this.pageNumber })
            .then(result => {
                this.properties = result.records;
                this.totalRecords = result.totalRecords;
            })
            .catch(error => {
                this.showToast('Error fetching properties', error.body ? error.body.message : error.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Pagination Logic
    get isFirstPage() {
        return this.pageNumber === 1;
    }

    get isLastPage() {
        return (this.pageNumber * this.pageSize) >= this.totalRecords || this.totalRecords === 0;
    }
    
    handlePrev() {
        if (!this.isFirstPage) {
            this.pageNumber--;
            this.fetchProperties();
        }
    }

    handleNext() {
        if (!this.isLastPage) {
            this.pageNumber++;
            this.fetchProperties();
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}