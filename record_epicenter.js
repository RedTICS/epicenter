var logger = require('winston');

var utils = require('./toolbox');


/***************************************
*             HeaderRecord             *
****************************************
* Sample header record text:
* H|\^&| | |Becton Dickinson| | | | | | | |V1.00|19981019184200
* 
**/
function HeaderRecord(){
    this.buildFromRecord = function(record){
        // Not implemented  as is not needed
    }
    
    this.toASTM = function (){
        return [ 
            'H',
            [ [null], [null,'&'] ],
            null,
            null,
            'Becton Dickinson',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            'V1.00',
            '20170510183000' // Not used in dowloaded messages
        ];
    }
}


/***************************************
*           TerminationRecord          *
****************************************
* Sample termination record text:
* L|1|N
* 
**/
function TerminationRecord(){
    this.type = 'N'
    
    this.buildFromRecord = function(record){
        // Not implemented  as is not needed
    }
    
    this.toASTM = function (){
        return [ 'L', '1', this.type];
    }
}


/***************************************
*              PatientRecord           *
****************************************
* Sample patient record text:
* 
* P|1| |PatId123| |Doe^John^R^Jr.^Dr.| |19651029|M| |2 Main 
* St.^Baltimore^ MD^21211^USA| |(410) 316 - 4000|JSMITH| | |
* | |PNEU|P\AM\AMX| | | |19981015120000| |324| | | | | | |ER|St. 
* Josephs Hospital
*
**/
function PatientRecord(){
    this.adress = '';
    this.phone = '';
    this.physicianId = '';
    this.diagnosis = '';
    this.admissionDate = '';
    this.roomNumber = '' ;
    this.hospitalService = '';
    this.hospitalClient= '';

    this.buildFromRecord = function(record){
        // TODO Check if pacient uploaded data is neccesary in LIS 
    }
    
    this.toASTM = function (){
        return [ 
            'P', 
            '1',
            null,
            this.id, // max_lenght=16
            null,
            [this.name,null,null,null,null], // max_lenght=40
            null,
            this.birthdate, // YYYYMMDDHHMMSS
            this.sex,
            null,
            [this.adress,null,null,null,null], // max_lenght = 255
            null,
            this.phone ,  // max_lenght = 25
            this.physicianId,
            null,
            null,
            null,
            null,
            this.diagnosis,
            this.toASTMComponent(this.therapy),  // therapy must be an array up to 5 antibiotics  Ej.  ['P','AM','AMX'].  This must be encoded to P\AM\AMX 
            null,
            null,
            null,
            this.admissionDate, // YYYYMMDDHHMMSS
            null,
            this.roomNumber,  // max_lenght = 10
            null,                       // User Defined Patient Fields. 
            null,
            null,
            null,
            null,
            null,
            this.hospitalService,
            this.hospitalClient,
            ];
    }
    
    this.toASTMComponent = function (component){
        if(typeof component === 'undefined' || component === null){
            return [];
        }
        else{
            var antibiotic = [component[0]];
            if (component.length == 1){
                return antibiotic;
            } 
            else{
                return [antibiotic, this.toASTMComponent(component.slice(1))]
            }
        }
    }
}



/***************************************
*           ResultRecord                                            *
****************************************
* Sample result record text:
* R|1|^^^458/|55|mg/dl||N||F|||||P1
* 
* BACTEC MGIT 960 growth and detection test level result example 
* R|1| ^ ^ ^GND_MGIT^430100001234|INST_POSITIVE ^87| | | | |P| | |19981019153400|19981020145000| MGIT960^^42^3^B/A12
* R|1| ^ ^ ^AST_MGIT^439400005678^P^0.5^ug/ml| INST_COMPLETE^105^^S| | | | |P| | |19981019153400| 19981020145000|MGIT960^^42^3^ B/A12 

* BACTEC MGIT 960 AST test level result example:
* R|1| ^ ^ ^AST_MGIT^439400005678^P^0.5^ug/ml| INST_COMPLETE^105^^S| | | | |P| | |19981019153400| 19981020145000|MGIT960^^42^3^ B/A12 
* 
* AST Result records contain antibiotic and susceptibility information.  
* ID Result records contain organism and Resistance Marker information.  
* Growth and Detection result records contain a Positive or Negative status.  
* For AST sets, several result records may be sent to the LIS in a single message.  
* Each result record would report the results for a single drug in the AST set.  
* For ID/AST combo tests, an ID result record is sent as the first result record, 
* and the AST result records follow.  An example AST set result message is shown 
* in the Appendix A of this document. 
*
**/
function ResultRecord(){
    this.buildFromRecord = function(record){
        try{
            this.type = record[0];
            this.seq = record[1];
            // this.code = record[2][3];
            // switch (this.code){
                // case "GND": handleResultGND(record); break;
                // case "GND_MGIT": handleResultGND_MGIT(record); break;
                // case "GND_PROBETEC": handleResultGND_PROBETEC(record);  break;
                // case "AST": handleResultAST(record); break;
                // case "AST_MGIT": handleResultAST_MGIT(record); break;
                // case "AST_MIC": handleResultAST_MIC(record); break;
                // case "AST_DIA": handleResultAST_DIA(record); break;
                // case "ID": handleResultID(record); break;
                // case "OTHER": handleResultOTHER(record); break;
            // } 
            if (this.fieldHasValue(record[2])) {
                this.code = this.getFieldValue(record[2],3);
                this.testSeqNumber = this.getFieldValue(record[2],4);
                this.antibiotic = this.getFieldValue(record[2],5);
                this.concentration = this.getFieldValue(record[2],6);
                this.concentrationUnit = this.getFieldValue(record[2],7);
            }
            if (this.fieldHasValue(record[3])) {
                this.testStatus = this.getFieldValue(record[3],0);
                // Result Data Field 1
                this.growthUnits = this.getFieldValue(record[3],1); // Bactec results only
                this.probeTecETAlgorithmicResult  = this.getFieldValue(record[3],1); // BDProbeTec ET/Viper SP Result Onlyactec results only
                this.minimumInhibitoryConcentration = this.getFieldValue(record[3],1); // MIC based AST results
                this.diameter = this.getFieldValue(record[3],1); // Diameter based AST results
                this.organism = this.getFieldValue(record[3],1); // ID results only
                // Result Data Field 2
                this.ASTsusceptibilityFinal = this.getFieldValue(record[3],2); // Isolate AST results only
                this.profileNumber = this.getFieldValue(record[3],2); // ID results and Isolate ID results
                // Result Data Field 3
                this.ASTsusceptibilityInterpreted = this.getFieldValue(record[3],3);// All AST Results
                this.resistanceMarker1 = this.getFieldValue(record[3],3); // Isolate ID results 
                // Result Data Field 4
                this.ASTsusceptibilityExpert = this.getFieldValue(record[3],4); // Isolate AST results only
                this.resistanceMarker2 = this.getFieldValue(record[3],5); // Isolate ID Results
                // Result Data Field 5
                this.ASTsourceTest = this.getFieldValue(record[3],5); // Isolate AST Results
                this.resistanceMarker3 = this.getFieldValue(record[3],5); // Isolate ID Results
                // Result Data Field 6
                this.resistanceMarker4 = this.getFieldValue(record[3],6); // Isolate ID Results
                // Result Data Field 7
                this.resistanceMarker5 = this.getFieldValue(record[3],7); // Isolate ID Results
            }
            this.preliminaryFinalStatus = record[8];
            this.startDate = record[11];
            if (this.fieldHasValue(record[12])) {
                this.resultStatusDate = this.getFieldValue(record[12],0);
                this.testCompleteDate = this.getFieldValue(record[12],1);
            }
            if (this.fieldHasValue(record[13])) {
                this.instrumentType = this.getFieldValue(record[13],0);
                this.mediaType = this.getFieldValue(record[13],1);
                this.protocolLength  = this.getFieldValue(record[13],2);
                this.instrumentNumber  = this.getFieldValue(record[13],3);
                this.instrumentLocation = this.getFieldValue(record[13],4);
                this.BDProbeTecETQCYype  = this.getFieldValue(record[13],5);
                this.BDProbeTecETQCKitLotNumber = this.getFieldValue(record[13],6);
            }
            if (this.fieldHasValue(record[14])) {
                this.additionalResultsQuantity = this.getFieldValue(record[14],0);
                this.additionalResults= this.getFieldValue(record[14],1);
            }
        }
        catch(err){
            logger.error('Cannot build ResultRecord.' + err);
            throw new Error(err);
        }
    }
    
        
    this.fieldHasValue= function(field) {
        return (typeof field !== 'undefined' && field !== null);
    }
    
    
    this.getFieldValue= function(field, index) {
        var value = '';
        if (Object.prototype.toString.call(field) === '[object Array]'){
            if (field.length > index){
                value = field[index];
            }
        }
        else{
            if (index === 0){
                value = field;
            }
        }
        return value;
    }
    
    /*
    * Identification test level result example: 
    * R|1| ^ ^ ^ID^Seq123|Complete^MYCBTUB^45678^RM_VRE| | | | |F| | |19981019153400|19981020145000
    */
    // this.handleResultID = function(record){
        
        // this.testSeqNumber = record[2][4];
        // this.testStatus = record[3][0];
        // this.organism = record[3][1];
        // this.profileNumber = record[3][2];
        // this.    = record[3][3];  // TODO Chequear si no es necesario por nulos o fuera de indices
        
        // this.preliminaryFinalStatus = record[8];
        // this.startDate = record[11];
        // this.resultDate = record[12];  // TODO Chequear si viene como un componente este valor
    // }
    
    
        
    // /*
    // * Isolate level result example: 
    // * R|1| ^^^AST^^P^100.0^ug/mL| ^^R^R^^MGIT_960_AST92| | | | |F 
    // */
    // this.handleResultAST = function(record){
        // this.testSeqNumber = record[2][4];
        // this.antibiotic = record[2][5];
        // this.concentration = record[2][6];
        // this.concentrationUnit = record[2][7];
        // this.testStatus = record[3][0];
        // this.susceptibilityFinal = record[3][2];
        // this.susceptibilityInterpreted = record[3][3];
        // this.susceptibilityExpert = record[3][4];
        // this.sourceTest = record[3][5];
        
        // this.preliminaryFinalStatus = record[8];
        // this.startDate = record[11];
        // this.resultDate = record[12];  // TODO Chequear si viene como un componente este valor
    // }

}





/****************************
* OrderRecord               *
***************************** 
* Sample order record text:
* O|1|Acc123^1^MYCBTUB | | ^ ^ ^ MGIT_960_GND ^Seq123| 
* | |19981019023300| | |SJB^MMF|A| | |19981019045200 
* |Blood^Arm|MJones|(410) 555 – 1234^(410) 555 – 9876^(410) 555 – 7777
* | | | | |19981020053400|62| |O| | |Nos
* 
*
* Sample order record decoded
*
**/
function OrderRecord(){
    this.seq = '1';
    this.isolateNumber = '';
    this.organism = '';
    this.excludeIsolate = ''; 
    this.testId = '';
    this.testConsumableSeq = '';
    this.priority = '';
    this.collectionDate = utils.formatDate(new Date(),'yyyyMMddHHmmss');
    this.collectedBy = '';
    this.receivedBy = '';
    this.specimenActionCode = '';
    this.receiptDate = utils.formatDate(new Date(),'yyyyMMddHHmmss');
    this.specimenType = '';
    this.bodySite = '';
    this.orderingPhysician = '';
    this.orderingPhysicianPhone = '';
    this.orderingPhysicianFax = '';
    this.orderingPhysicianPager = '';
    this.userDefinedFields = '';
    this.finalizedDate = '';
    this.specimenRebursementValue = '';
    this.reportType = '';
    this.isolateClassification = '';
    
    this.buildFromRecord = function(record){
        try{
            this.type = record[0];
            this.seq = record[1];
            if (this.fieldHasValue(record[2])) {
                this.accessionNumber = this.getFieldValue(record[2], 0); // max_lenght = 20. ProtocolID 
                this.isolateNumber = this.getFieldValue(record[2],1); 
                this.organism = this.getFieldValue(record[2],2);
                this.excludeIsolate = this.getFieldValue(record[2],3);
            }
            if (this.fieldHasValue(record[4])) {
                this.testId = this.getFieldValue(record[4],3);
                this.testConsumableSeq = this.getFieldValue(record[4],4);
            }
            this.priority = record[5];
            this.collectionDate = record[7];
            if (this.fieldHasValue(record[10])) {
                this.collectedBy = this.getFieldValue(record[10],0);
                this.receivedBy = this.getFieldValue(record[10],1);
            }
            this.specimenActionCode = record[11];
            if (this.fieldHasValue(record[13])) {
                this.isolateSourceTest = this.getFieldValue(record[13],0);//  [[[],[],[]],[[],[],[]]]
                this.isolateSourceTestStartTime = this.getFieldValue(record[13],1); 
            }
            this.receiptDate = record[14];
            if (this.fieldHasValue(record[15])) {
                this.specimenType = this.getFieldValue(record[15],0);
                this.bodySite = this.getFieldValue(record[15],1);
            }
            this.orderingPhysician  = record[16];
            if (this.fieldHasValue(record[17])) {
                this.orderingPhysicianPhone = this.getFieldValue(record[17],0)
                this.orderingPhysicianFax = this.getFieldValue(record[17],1)
                this.orderingPhysicianPager = this.getFieldValue(record[17],2)
            }
            // this.userDefinedFields = record[18];
            this.finalizedDate = record[22];
            this.specimenRebursementValue = record[23];  // TODO check with real values from Epicenter
            // this.testReimbursementValue = record[23][1];
            this.reportType = record[25];
            this.isolateClassification = record[28];

        }
        catch(err){
            logger.error('Cannot build OrderRecord.' + err)
            throw new Error(err);
        }
    }

        
    this.toASTM = function (){
        var timestamp = utils.formatDate(new Date(),'yyyyMMddHHmmss');
        return [ 
            'O',
            this.seq,
            [this.accessionNumber, this.isolateNumber, this.organism, this.excludeIsolate],
            null,
            [null, null, null, this.testId,this.testConsumableSeq],
            this.priority,
            null,
            this.collectionDate,
            null,
            null,
            [this.collectedBy, this.receivedBy],
            this.specimenActionCode,
            null,
            this.toASTMComponent(this.isolateSourceTest,this.isolateSourceTestStartTime),
            this.receiptDate,
            [this.specimenType, this.bodySite],
            this.orderingPhysician,
            [this.orderingPhysicianPhone,this.orderingPhysicianFax,this.orderingPhysicianPager],
            this.userDefinedFields,
            null,
            null,
            null,
            this.finalizedDate,
            this.specimenRebursementValue, //this.testReimbursementValue
            null,
            this.reportType,
            null,
            null,
            this.isolateClassification
            ];
        }
        
    this.toASTMComponent = function (isolateSourceTest, isolateSourceTestStartTime){
        // Should return [[[],[],[]],[[],[],[]]]
        return null;
        // var antibiotic = [component[0]];
        // if (component.length == 1){
            // return antibiotic;
        // } 
        // else{
            // return [antibiotic, this.toASTMComponent(component.slice(1))]
        // }
    }
    
    this.fieldHasValue= function(field) {
        return (typeof field !== 'undefined' && field !== null);
    }
    
    
    this.getFieldValue= function(field, index) {
        var value = '';
        if (Object.prototype.toString.call(field) === '[object Array]'){
            if (field.length >= index){
                value = field[index];
            }
        }
        else{
            if (index === 0){
                value = field;
            }
        }
        return value;
    }
  
}


/***************************************
*              CommentRecord           *
****************************************
* Sample comment record text:
* C|1| | Special message text.(AM, CAZ)|T 
* 
**/
function CommentRecord(){
    this.buildFromRecord = function(record){
        try{
            this.type = record[0];
            this.seq = record[1];
            this.comment = record[4];
            this.commentType = record[5];
        }
    catch(err){
            logger.error('Cannot build CommentRecord.' + err)
            throw new Error(err);
        }
    }
    
    this.toASTM = function (){
       return [ 
            'C', 
            '1', 
            null, 
            this.comment, 
            this.commentType];   // This field should be a P, S, I, E, or T for patient, specimen, isolate, chartables rule, or special message comments respectively
    }

}





module.exports = {
    ResultRecord: ResultRecord,
    OrderRecord : OrderRecord,
    HeaderRecord : HeaderRecord,
    TerminationRecord : TerminationRecord,
    CommentRecord : CommentRecord,
    PatientRecord : PatientRecord,
};