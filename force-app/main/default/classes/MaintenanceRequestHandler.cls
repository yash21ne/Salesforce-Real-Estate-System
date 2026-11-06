public with sharing class MaintenanceRequestHandler {
    
    // Method to assign vendor with least workload before insert
    public static void assignVendorWithLeastWorkload(List<Maintenance_Request__c> newRequests) {
        
        // 1. Get all active vendors
        List<Vendor__c> allVendors = [SELECT Id FROM Vendor__c LIMIT 10000];
        
        if(allVendors.isEmpty()) {
            return; 
        }
        
        // 2. Map to store Vendor Id and their current active workload count
        Map<Id, Integer> vendorWorkloadMap = new Map<Id, Integer>();
        
        // Initialize all vendors with 0 workload
        for(Vendor__c v : allVendors) {
            vendorWorkloadMap.put(v.Id, 0);
        }
        
        // 3. Get count of Open/In Progress requests per Vendor
        AggregateResult[] groupedResults = [
            SELECT Vendor__c, COUNT(Id) reqCount 
            FROM Maintenance_Request__c 
            WHERE Status__c IN ('Open', 'In progress') 
            AND Vendor__c != null 
            GROUP BY Vendor__c
        ];
        
        // Update map with actual counts
        for(AggregateResult ar : groupedResults) {
            Id vendorId = (Id) ar.get('Vendor__c');
            Integer count = (Integer) ar.get('reqCount');
            if(vendorWorkloadMap.containsKey(vendorId)) {
                vendorWorkloadMap.put(vendorId, count);
            }
        }
        
        // 4. Find the Vendor with the absolute minimum workload
        Id leastLoadedVendorId = allVendors[0].Id;
        Integer minWorkload = vendorWorkloadMap.get(leastLoadedVendorId);
        
        for(Id vId : vendorWorkloadMap.keySet()) {
            if(vendorWorkloadMap.get(vId) < minWorkload) {
                minWorkload = vendorWorkloadMap.get(vId);
                leastLoadedVendorId = vId;
            }
        }
        
        // 5. Assign this vendor to all incoming Maintenance Requests
        for(Maintenance_Request__c req : newRequests) {
            // Update only the empty vendors
            if(req.Vendor__c == null) {
                req.Vendor__c = leastLoadedVendorId;
            }
        }
    }
}