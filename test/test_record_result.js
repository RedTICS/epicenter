var assert = require('assert');


var token = require('../constants');
var codec = require('../codec');
var record = require('../record_epicenter');

describe('Test suite for record module', function() {
    describe('BuildTestCase', function() {
         it('result_record_build', function() {
            var msg = 'R|1| ^ ^ ^GND_MGIT^430100001234|INST_POSITIVE ^87| | | | |P| | |19981019153400|19981020145000| MGIT960^^42^3^B/A12 ';
            rec =  codec.decode(msg,token.ENCODING);
            console.log(rec);
            var o = new record.ResultRecord();
            o.buildFromRecord(rec);
            console.log(o);
            // rec =  codec.encodeRecord(o.toASTM(),token.ENCODING);
            
            // if (msg === rec){
                // console.log('####TODO BIEN');
            // }
            // else{
                // console.log('####TODO MAL');
            // }
            // console.log(msg);
            // console.log(rec);
        });
        
       
        it('result_record_build_1', function() {
            // BACTEC MGIT 960 AST test level result example
            var msg = 'R|1| ^ ^ ^AST_MGIT^439400005678^P^0.5^ug/ml| INST_COMPLETE^105^^S| | | | |P| | |19981019153400| 19981020145000|MGIT960^^42^3^ B/A12 ';
            rec =  codec.decode(msg,token.ENCODING);
            console.log(rec);
            var o = new record.ResultRecord();
            o.buildFromRecord(rec);
            console.log(o);
        });
        
        
        it('result_record_build_2', function() {
            // Phoenix AST MIC test level result example
            var msg = 'R|1| ^ ^ ^AST_MIC^429530000002^P| INST_COMPLETE^0.5^^S| | | | | F| | |19981019153400| 19981020145000';
            rec =  codec.decode(msg,token.ENCODING);
            console.log(rec);
            var o = new record.ResultRecord();
            o.buildFromRecord(rec);
            console.log(o);
        });
        
    });
});


