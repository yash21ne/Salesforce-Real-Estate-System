import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createPropertyWithImage from '@salesforce/apex/PropertyController.createPropertyWithImage';

export default class PropertyCreator extends LightningElement {
    isLoading = false;
    fileData;
    fileName;

    typeOptions = [
        { label: 'Residential', value: 'Residential' },
        { label: 'Commercial', value: 'Commercial' }
    ];

    furnishOptions = [
        { label: 'Furnished', value: 'Furnished' },
        { label: 'Semi-Furnished', value: 'Semi-Furnished' },
        { label: 'Unfurnished', value: 'Unfurnished' }
    ];

    statusOptions = [
        { label: 'Occupied', value: 'Occupied' },
        { label: 'Available', value: 'Available' }
    ];

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.fileName = file.name;
            let reader = new FileReader();
            reader.onload = () => {
                let base64 = reader.result.split(',')[1];
                this.fileData = base64;
            };
            reader.readAsDataURL(file);
        }
    }

    handleSave() {
        // UI Validation
        const allValid = [...this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea')]
            .reduce((validSoFar, inputCmp) => {
                inputCmp.reportValidity();
                return validSoFar && inputCmp.checkValidity();
            }, true);

        if (!allValid) {
            this.showToast('Error', 'Please fill all required fields.', 'error');
            return;
        }

        if (!this.fileData) {
            this.showToast('Error', 'Property Image is strictly required.', 'error');
            return;
        }

        this.isLoading = true;

        // Collect Data
        let propRecord = { 'sobjectType': 'Property__c' };
        this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea').forEach(field => {
            if (field.dataset.id) {
                propRecord[field.dataset.id] = field.value;
            }
        });

        // Call Apex
        createPropertyWithImage({
            propertyData: propRecord,
            fileName: this.fileName,
            base64Data: this.fileData
        })
            .then(resultId => {
                this.showToast('Success', 'Property Created Successfully! ID: ' + resultId, 'success');
                // Reset form
                this.fileData = null;
                this.fileName = null;
                this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea').forEach(field => field.value = null);
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}