import { LightningElement, api, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import JSPDF from '@salesforce/resourceUrl/jsPDF';
import getAgreementDetails from '@salesforce/apex/LeaseAgreementController.getAgreementDetails';
import sendAgreementEmail from '@salesforce/apex/LeaseAgreementController.sendAgreementEmail';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LeaseAgreementManager extends LightningElement {
    @api recordId; // Automatically gets the Lease Agreement Record ID
    agreementData;
    isLibraryLoading = true;
    isLoading = false;

    // Fetch data using wire
    @wire(getAgreementDetails, { agreementId: '$recordId' })
    wiredAgreement({ error, data }) {
        if (data) {
            this.agreementData = data;
        } else if (error) {
            this.showToast('Error', 'Failed to load agreement data.', 'error');
        }
    }

    // Load jsPDF library when component renders
    renderedCallback() {
        if (this.isLibraryLoading) {
            loadScript(this, JSPDF)
                .then(() => {
                    this.isLibraryLoading = false;
                })
                .catch(error => {
                    this.showToast('Error', 'Failed to load jsPDF library. Check Static Resource.', 'error');
                });
        }
    }

    // Reusable function to draw PDF content
    generatePDFDocument() {
        // window.jspdf is available after loadScript
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const data = this.agreementData;
        if(!data) return null;

        // Styling and adding text to PDF
        doc.setFontSize(22);
        doc.text('Lease Agreement', 105, 20, null, null, 'center');
        
        doc.setFontSize(12);
        doc.text(`Agreement Reference: ${data.Name}`, 14, 40);
        doc.text(`Property: ${data.Property__r ? data.Property__r.Name : 'N/A'}`, 14, 50);
        doc.text(`Tenant: ${data.Tenant__r ? data.Tenant__r.Name : 'N/A'}`, 14, 60);
        doc.text(`Start Date: ${data.Start_Date__c}`, 14, 70);
        doc.text(`End Date: ${data.End_Date__c}`, 14, 80);
        doc.text(`Monthly Rent: Rs. ${data.Agreed_Monthly_Rent__c}`, 14, 90);
        
        doc.text('Terms & Conditions:', 14, 110);
        
        // Wrap long text for terms
        const splitTerms = doc.splitTextToSize(data.Terms__c || 'No terms specified.', 180);
        doc.text(splitTerms, 14, 120);

        return doc;
    }

    // Button Action: Download
    handleDownloadPDF() {
        if(!this.agreementData) return;
        const doc = this.generatePDFDocument();
        // Save file locally in browser
        doc.save(`Lease_Agreement_${this.agreementData.Name}.pdf`);
    }

    // Button Action: Send Email
    handleSendEmail() {
        if(!this.agreementData || !this.agreementData.Tenant__r || !this.agreementData.Tenant__r.Email__c) {
            this.showToast('Error', 'Tenant Email is missing.', 'error');
            return;
        }

        this.isLoading = true;
        const doc = this.generatePDFDocument();
        
        // Convert PDF to Base64 String (Data URI)
        const base64PDF = doc.output('datauristring');
        
        // Send to Apex
        sendAgreementEmail({ 
            agreementId: this.recordId, 
            tenantEmail: this.agreementData.Tenant__r.Email__c, 
            base64PDF: base64PDF 
        })
        .then(() => {
            this.showToast('Success', 'Email sent successfully to tenant!', 'success');
        })
        .catch(error => {
            this.showToast('Email Failed', error.body ? error.body.message : error.message, 'error');
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}