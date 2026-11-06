public with sharing class PropertyController {
    
    // Wrapper class UI se JSON payload properly parse karne ke liye
    public class PropertyFilterWrapper {
        public Decimal maxPrice;
        public String availabilityStatus;
        public String furnishingStatus;
        public Decimal maxDistanceKm;
        public Decimal userLat;
        public Decimal userLng;
    }

    // Wrapper class LWC ko paginated data wapas bhejne ke liye
    public class PagedResultWrapper {
        @AuraEnabled public Integer pageSize {get;set;}
        @AuraEnabled public Integer pageNumber {get;set;}
        @AuraEnabled public Integer totalRecords {get;set;}
        @AuraEnabled public List<Property__c> records {get;set;}
    }

    @AuraEnabled(cacheable=true)
    public static PagedResultWrapper getProperties(String filtersJSON, Integer pageNumber) {
        // Requirement: 25 records per page
        Integer pageSize = 25; 
        Integer offset = (pageNumber - 1) * pageSize;
        
        PagedResultWrapper result = new PagedResultWrapper();
        result.pageSize = pageSize;
        result.pageNumber = pageNumber;
        
        // Deserialize payload using wrapper
        PropertyFilterWrapper filters = (PropertyFilterWrapper) JSON.deserialize(filtersJSON, PropertyFilterWrapper.class);
        
        // Base queries
        String baseQuery = 'SELECT Id, Name, Address__c, City__c, State__c, Rent__c, Status__c, Furnishing_Status__c, Type__c, Location__Latitude__s, Location__Longitude__s FROM Property__c';
        String countQuery = 'SELECT COUNT() FROM Property__c';
        List<String> conditions = new List<String>();

        Decimal maxPrice;
        String aStatus;
        String fStatus;
        Decimal userLat;
        Decimal userLng;
        Decimal maxDist;

        if (filters != null) {
            if (filters.maxPrice != null) {
                maxPrice = filters.maxPrice;
                conditions.add('Rent__c <= :maxPrice');
            }
            if (String.isNotBlank(filters.availabilityStatus)) {
                aStatus = filters.availabilityStatus;
                conditions.add('Status__c = :aStatus');
            }
            if (String.isNotBlank(filters.furnishingStatus)) {
                fStatus = filters.furnishingStatus;
                conditions.add('Furnishing_Status__c = :fStatus');
            }
            if (filters.maxDistanceKm != null && filters.userLat != null && filters.userLng != null) {
                userLat = filters.userLat;
                userLng = filters.userLng;
                maxDist = filters.maxDistanceKm;
                // Geolocation SOQL function for distance
                conditions.add('DISTANCE(Location__c, GEOLOCATION(:userLat, :userLng), \'km\') < :maxDist');
            }
        }

        String whereClause = '';
        if (!conditions.isEmpty()) {
            whereClause = ' WHERE ' + String.join(conditions, ' AND ');
        }

        // Count total records for pagination max pages logic
        countQuery += whereClause;
        result.totalRecords = Database.countQuery(countQuery);

        // Fetch actual paginated records
        baseQuery += whereClause + ' ORDER BY CreatedDate DESC LIMIT :pageSize OFFSET :offset';
        result.records = Database.query(baseQuery);

        return result;
    }

    @AuraEnabled
    public static String createPropertyWithImage(Property__c propertyData, String fileName, String base64Data) {
        // Transaction control start - Agar kuch fail hua toh pura rollback hoga
        Savepoint sp = Database.setSavepoint();
        try {
            // 1. Insert Property
            insert propertyData;

            // 2. Insert File (ContentVersion)
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            cv.IsMajorVersion = true;
            insert cv;

            // 3. Get ContentDocumentId
            Id conDocId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1].ContentDocumentId;

            // 4. Link File to Property (ContentDocumentLink)
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.LinkedEntityId = propertyData.Id;
            cdl.ContentDocumentId = conDocId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;

            return propertyData.Id;
        } catch (Exception e) {
            Database.rollback(sp);
            throw new AuraHandledException('Error creating property: ' + e.getMessage());
        }
    }
}