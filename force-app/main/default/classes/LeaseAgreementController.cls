public with sharing class LeaseAgreementController {
    
    @AuraEnabled(cacheable=true)
    public static Lease_Agreement__c getAgreementDetails(Id agreementId) {
        return [SELECT Id, Name, Terms__c, Agreed_Monthly_Rent__c, Start_Date__c, End_Date__c,
                       Property__r.Name, Property__r.Address__c,
                       Tenant__r.Name, Tenant__r.Email__c
                FROM Lease_Agreement__c 
                WHERE Id = :agreementId LIMIT 1];
    }

    @AuraEnabled
    public static void sendAgreementEmail(Id agreementId, String tenantEmail, String base64PDF) {
        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { tenantEmail });
            mail.setSubject('Your Lease Agreement Details');
            mail.setPlainTextBody('Dear Tenant,\n\nPlease find attached your lease agreement.\n\nRegards,\nProperty Management');
            
            Messaging.EmailFileAttachment attach = new Messaging.EmailFileAttachment();
            attach.setContentType('application/pdf');
            attach.setFileName('Lease_Agreement.pdf');
            // Remove the data URI prefix if passed from JS (e.g., 'data:application/pdf;base64,')
            String cleanBase64 = base64PDF.contains(',') ? base64PDF.substringAfter(',') : base64PDF;
            attach.setBody(EncodingUtil.base64Decode(cleanBase64));
            
            mail.setFileAttachments(new Messaging.EmailFileAttachment[] { attach });
            
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch (Exception e) {
            throw new AuraHandledException('Error sending email: ' + e.getMessage());
        }
    }
}