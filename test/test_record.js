var assert = require('assert');


var token = require('../constants');
var codec = require('../codec');
var record = require('../record_epicenter');

describe('Test suite for record module', function() {
    describe('ToTestCase', function() {
        it('termination_record_toASTM', function() {
            var msg = 'L|1|N';
            var rec = new record.TerminationRecord();
            rec =  codec.encodeRecord(rec.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        it('patient_record_toASTM', function() {
            var msg = 'P|1||PatId123||Doe John R Jr. Dr.^^^^||19651029|M||2 Main St. Baltimore MD 21211 USA^^^^||(410) 316 - 4000|JSMITH||||||P\\AM\\AMX||||19981015120000||324|||||||ER|St. Josephs Hospital';
            var p = new record.PatientRecord();
            
            p.id = 'PatId123';
            p.name = 'Doe John R Jr. Dr.';
            p.birthdate = '19651029';
            p.sex = 'M';
            p.adress = '2 Main St. Baltimore MD 21211 USA';
            p.phone = '(410) 316 - 4000';
            p.physicianId = 'JSMITH';
            p.diagnosis = '';
            p.therapy = ['P','AM','AMX'];
            p.admissionDate = '19981015120000';
            p.roomNumber = '324';
            p.hospitalService = 'ER';
            p.hospitalClient = 'St. Josephs Hospital';
            rec =  codec.encodeRecord(p.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        it('order_record_toASTM_uploaded', function() {
            var msg = 'O|1|Acc123^^^Seq123||^^^MGIT_960_GND|||19981019023300|||SJB^MMF|A|||19981019045200|Blood^Arm|MJones|(410)555–1234^(410)555-9876^(410)555-7777|||||19981020053400|62||O|||Nos';
            
            var o = new record.OrderRecord();
            o.accessionNumber = 'Acc123';
            o.excludeIsolate = 'Seq123';
            o.testId = 'MGIT_960_GND';
            o.collectionDate = '19981019023300';
            o.collectedBy = 'SJB';
            o.receivedBy = 'MMF';
            o.specimenActionCode = 'A';
            o.receiptDate = '19981019045200';
            o.specimenType = 'Blood';
            o.bodySite = 'Arm';
            o.orderingPhysician = 'MJones';
            o.orderingPhysicianPhone = '(410)555–1234';
            o.orderingPhysicianFax = '(410)555-9876';
            o.orderingPhysicianPager = '(410)555-7777';
            o.finalizedDate = '19981020053400';
            o.specimenRebursementValue  = '62';
            o.reportType = 'O';
            o.isolateClassification = 'Nos';
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });

        it('order_record_toASTM', function() {
            var msg = 'O|1|Acc456^2^STACOH^||^^^ISOLATE RESULT|||20041104082700|||^||||20041104082750|^||^^|||||||||||UNK'
            // var msg = 'O|1| Acc456                   ||^^^MGIT_960_GND^430100065177|R|| 20041104082700|||||||20041104082750||||||||20050316152949 '
            // var msg = 'O|1| Acc456                   ||^^^PLUSANF^449305384011           |R|| 20041104082700|||||||20041104082750||||||||20050316153238 '
            // var msg = 'O|1|Acc123                    ||^^^MGIT_960_GND '
            // var msg = 'O|1|Acc123^1               ||^^^ISOLATE_RESULT '
            
            // var msg = 'O|1|Acc123^1^MYCBTUB | | ^ ^ ^ MGIT_960_GND ^Seq123| | |19981019023300| | |SJB^MMF|A| | |19981019045200 |Blood^Arm|MJones|(410) 555 – 1234^(410) 555 – 9876^(410) 555 – 7777| | | | |19981020053400|62| |O| | |Nos '
            var o = new record.OrderRecord();
            o.accessionNumber = 'Acc456';
            o.isolateNumber = '2';
            o.organism = 'STACOH';
            o.testId = 'ISOLATE RESULT';
            o.collectionDate = '20041104082700';
            o.collectedBy = '';
            o.receivedBy = '';
            o.specimenActionCode = '';
            o.receiptDate = '20041104082750';
            o.specimenType = '';
            o.bodySite = '';
            o.orderingPhysician = '';
            o.orderingPhysicianPhone = '';
            o.orderingPhysicianFax = '';
            o.orderingPhysicianPager = '';
            o.finalizedDate = '';
            o.specimenRebursementValue  = '';
            o.reportType = '';
            o.isolateClassification = 'UNK';
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });

    });
    
    describe('BuildTestCase', function() {
         it('order_record_build', function() {
            var msg = 'O|1|Acc123^^^Seq123||^^^MGIT_960_GND|||19981019023300|||SJB^MMF|A|||19981019045200|Blood^Arm|MJones|(410)555–1234^(410)555-9876^(410)555-7777|||||19981020053400|62||O|||Nos';
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        
         it('order_record_build2', function() {
            var msg = 'O|1|Acc456^2^STACOH^||^^^ISOLATE RESULT|||20041104082700|||^||||20041104082750|^||^^|||||||||||UNK'
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        
        it('order_record_build3', function() {
            var msg = 'O|1|Acc123||^^^MGIT_960_GND '
            
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        it('order_record_build4', function() {
            var msg = 'O|1|Acc123^1||^^^ISOLATE_RESULT '
            
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        
        it('order_record_build5', function() {
            var msg = 'O|1| Acc456^^^||^^^PLUSANF^449305384011|R|| 20041104082700|||||||20041104082750||||||||20050316153238 ';
            
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        it('order_record_build6', function() {
            // var msg = 'O|1| Acc456^^^||^^^PLUSANF^449305384011|R|| 20041104082700|||||||20041104082750||||||||20050316153238 ';
            var msg = 'O|1|Acc123^1^MYCBTUB^||^^^MGIT_960_GND^Seq123|||19981019023300|||SJB^MMF|A|||19981019045200|Blood^Arm|MJones|(410)555–1234^(410)555–9876^(410)555–7777|||||19981020053400|62||O|||Nos'
            rec =  codec.decode(msg,token.ENCODING);
            var o = new record.OrderRecord();
            o.buildFromRecord(rec);
            rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            if (msg === rec){
                console.log('####TODO BIEN');
            }
            else{
                console.log('####TODO MAL');
            }
            console.log(msg);
            console.log(rec);
        });
        
        
        
        });
});


