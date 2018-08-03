var logger = require('winston');

var utils = require('./toolbox');


/***************************************
*             HeaderRecord             *
****************************************
* Sample header record text:
* H|\^&|||host^1|||||cobas c 311|TSDWN^BATCH|P|1
* 
**/
function HeaderRecord(record){
    this.build = function(record){
        
    }
    
    this.toASTM = function (){
        return [ 
            'H',
            [ [null], [null,'&'] ],
            null,
            null,
            [ 'host', '1' ],
            null,
            null,
            null,
            null,
            'cobas c 311',
            [ 'TSDWN', 'BATCH' ],
            'P',
            '1' 
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
function TerminationRecord(record){
    this.build = function(record){
        
    }
    
    this.toASTM = function (){
        return [ 'L', '1', 'N' ];
    }
}


/***************************************
*              PatientRecord           *
****************************************
* Sample patient record text:
* P|1||||||20070921|M||||||35^Y
* 
**/
function PatientRecord(record){
    this.build = function(record){
        
    }
    
    this.toASTM = function (){
        return [ 'P', '1',null,null,null,null,null,null,this.sex,null,null,null,null,null,[null,null]];
    }
}


/***************************************
*           ResultRecord               *
****************************************
* Sample result record text:
* R|1|^^^458/|55|mg/dl||N||F|||||P1
* 
* Sample result record decoded:
* [ 'R','1',[ null, null, null, '458/' ],'55','mg/dl',null,'N',null,'F',null,null,null,null,'P1' ]
**/
function ResultRecord(record){
    try{
        this.type = record[0];
        this.seq = record[1];
        this.test = record[2][3].slice(0,-1); // Remove last character '/'
        this.value = parseFloat(record[3]);
        this.units = record[4];
        // Others result record fields
        // references
        // abnormal_flag
        // abnormality_nature
        // status
        // norms_changed_at
        // operator
        // started_at
        // completed_at
        // instrument
    }
    catch(err){
        logger.error('Cannot build ResultRecord.' + err);
        throw new Error(err);
    }

}



/****************************
* OrderRecord               *
***************************** 
* Sample order record text:
* O|1|0^                   806^1^^001|R1|^^^458/|R||||||N||^^||SC|||      |                              ^                         ^                    ^               ^          |||20161111095305|||F',  (Upload)
* O|1|0^                   333^1^^001|R1|^^^458/|R||||||A||^^||SC|||      |                              ^                         ^                    ^               ^          ||||||0',                (Download)
* 
*
* Sample order record decoded
* [ 'O',
* '1',
* [ '0', '                   806', '1', null, '001' ],
* 'R1',
* [ null, null, null, '458/' ],
* 'R',
* null,
* null,
* null,
* null,
* null,
* 'N',
* null,
* [ null, null, null ],
* null,
* 'SC',
* null,
* null,
* '      ',
* [ '                              ','                         ','                    ','               ','          ' ],
* null,
* null,
* '20161111095305',
* null,
* null,
* 'F' ],
**/
function OrderRecord(){
    this.build = function(record){
        try{
            this.type = record[0];
            this.seq = record[1];
            // El nro de protocolo puede estar compuesto por nro_protocolo + prefijo de tipo de muestra
            // Esta forma del protocolo es un parche utilizado por el momento para poder identificar 
            // en el equipo CobasC311 aquellos analisis que son en esencia lo mismo pero que se tienen 
            // que realizar en diferentes horarios, como por ejemplo el analisis de la glucemia
            var sampleId =  record[2]; 
            var prefijoTipoMuestra = '';  
            
            if (sampleId.indexOf('-')> -1){
                var complexOrderSampleId = sampleId.split('-');
                sampleId =  complexOrderSampleId[0];            // Nro de protocolo
                prefijoTipoMuestra = complexOrderSampleId[1];   // Prefijo del tipo de muestra
            }
            
            this.sampleId = parseInt(sampleId);
            this.prefijoTipoMuestra = prefijoTipoMuestra;
            this.biomaterial = record[15];
            this.dateTimeReported = new Date();
            // Others order record fields   
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
            '1',
            this.sampleId,
            [ '0', null, null, null, this.sampleType,'SC'], // Por ej.[ '0', '50001', '001', null, 'S1','SC'], S1=Plasma, S2=Urine
            this.toASTMTestComponent(this.tests), 
            this.priority,
            null,                       // Requested/Ordered Date and Time                                
            timestamp,              // Indicates reception date and time of request.  Setting is as follows.  Deletable. YYYYMMDDHHMMSS
            null,
            null,
            null,
            'A',
            null,
            null,
            null,
            this.biomaterial,           // This field indicates the type of sample. 1=Plasma, 2=Urine
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            'O' ];
        }
        
    this.toASTMTestComponent = function (testArray){
        var test = [null,null,null,testArray[0].id,null];
        if (testArray.length == 1){
            return test;
        } 
        else{
            return [test, this.toASTMTestComponent(testArray.slice(1))]
        }
    }
}

/***************************************
*              TestComponent           *
****************************************
* Use only for OrderRecord
* 
**/

function TestComponent(id){
    this.id = id;
}



/***************************************
*              CommentRecord           *
****************************************
* Sample comment record text:
* C|1|I|                              ^                         ^                    ^               ^          |G
* 
**/
function CommentRecord(record){
    this.build = function(record){
        
    }
    
    this.toASTM = function (){
       return [ 
            'C', 
            '1', 
            'L', 
            ['                              ','                         ','                    ','               ','          '], 
            'G' ];
    }
}





module.exports = {
    ResultRecord: ResultRecord,
    OrderRecord : OrderRecord,
    HeaderRecord : HeaderRecord,
    TerminationRecord : TerminationRecord,
    CommentRecord : CommentRecord,
    PatientRecord : PatientRecord,
    TestComponent : TestComponent,
};