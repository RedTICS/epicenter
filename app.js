var config = require('./config');
var logger = require('winston');

var db = require('./db');
var record = require('./record_epicenter')

function processMessage(records){
    // Determinar si la secuencia se trata una consulta o resultados
    // provenientes del EpiCenter
    var messageType = records[2][0];
    switch (messageType){
        case "O": processMessageResults(records); break;
        case "Q": processMessageQueries(recordr); break;
    }
}

function processMessageResults(records){
    var record = [];
    var resultados = [];
    for (var i = 0; i < records.length; i++) {
        record = records[i];
        switch (record[0]){
            case "H": handleHeader(record); break;
            case "P": handlePatient(record); break;
            case "O": orderRecord = record; break;
            case "R": resultados.push([record, orderRecord]); break;
            case "C": handleComment(record);  break;
            case "L": handleTerminator(record); break;
        }
    }
    processResultsAsPromises(resultados);
}

function processResultsAsPromises(resultados){
    let chain = Promise.resolve();
    for (let rec of resultados) {
        chain = chain.then(()=>handleResult(rec[0],rec[1]))
            // .then(Wait)
    }
    return chain;
}

function Wait() {
    return new Promise(r => setTimeout(r, 1000))
}

function processMessageQueries(records){
    var record = [];
    for (var i = 0; i < records.length; i++) {
        record = records[i];
        switch (record[0]){
            case "H": handleHeader(record); break;
            case "Q": handleInquiry(record); break;
            case "L": handleTerminator(record); break;
        }
    }
}


function handleHeader(record){}

function handleInquiry(record){}

function handlePatient(record){}

function handleComment(record){}

function handleOrder(order){}

function handleTerminator(record){}

function handleResult(resultRecord, orderRecord){
    // Return a Promise
    var order = new record.OrderRecord();
    order.buildFromRecord(orderRecord);
    var result = new record.ResultRecord(); 
    result.buildFromRecord(resultRecord);
    switch (result.code){
        case "GND": return db.saveResultGND(result, order); break;
        case "GND_MGIT": break;
        case "GND_PROBETEC": break;
        case "AST": return db.saveResultAST(result, order); break;
        case "AST_MGIT": break;
        case "AST_MIC": return db.saveResultAST(result, order); break;
        case "AST_DIA": break;
        case "ID": return db.saveResultID(result, order); break;
        case "OTHER": break;
    }

    return Promise.resolve();
}


function composeOrderMessages(protocol){
    var header = new record.HeaderRecord();
    var patient = createPatientRecordFromProtocol(protocol);
    var order = createOrderRecordFromProtocol(protocol);
    var termination = new record.TerminationRecord();
    console.log(patient.toASTM());
    console.log(order.toASTM());
    return [[header.toASTM(), patient.toASTM(), order.toASTM(), termination.toASTM()]];
}

function createPatientRecordFromProtocol(protocol){
    var patient = new record.PatientRecord();
    patient.birthdate = protocol.anioNacimiento;
    patient.sex = protocol.sexo;
    patient.hospitalService = protocol.sectorSolicitante;
    datos_extras = protocol.paciente.split("-");
    patient.id= datos_extras[0].replace(/\s+/g,"");
	patient.name = cleanString(datos_extras[1]);

	
    return patient;
}

function cleanString (st)
{
        var ltr = ['[àáâãä]','[èéêë]','[ìíîï]','[òóôõö]','[ùúûü]','ñ','ç','[ýÿ]',
                '[ÀÁÂÃÄ]','[ÈÉÊË]','[ÌÍÎÏ]','[ÒÓÔÕÖ]','[ÙÚÛÜ]','Ñ','Ç','[ÝŸ]'];
        var rpl = ['a','e','i','o','u','n','c','y','A','E','I','O','U','N','C','Y'];
        var str = String(st);
        
        for (var i = 0, c = ltr.length; i < c; i++)
        {
        	var rgx = new RegExp(ltr[i],'g');
        	str = str.replace(rgx,rpl[i]);
        };
        
        if (str.length > 30) {
            str = str.substring(0, str.lastIndexOf(" "));
        }

        return str;
};

function createOrderRecordFromProtocol(protocol){
    var order = new record.OrderRecord();
    order.accessionNumber = protocol.numeroProtocolo.trim();
    order.specimenType = protocol.tipoMuestra;
    // // Tipo de muestra
    // var tipoMuestra = 1;
    // switch (tipoMuestraNombre){
    //         case "Suero/Plasma": tipoMuestra=1;break;
    //         case "Orina": tipoMuestra=2;break;
    //         case "CSF": tipoMuestra=3;break;
    //         case "Suprnt": tipoMuestra=4;break;
    //         case "Otros": tipoMuestra=5;break;
    //     }
    return order;

}

module.exports = {
    processMessage : processMessage,
    processMessageResults : processMessageResults,
    processMessageQueries : processMessageQueries,
    composeOrderMessages: composeOrderMessages
};

