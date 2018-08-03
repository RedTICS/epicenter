var config = require('./config');

var logger = require('winston');
logger.level = config.logLevel;
// logger.exitOnError = false;
// logger.handleExceptions(new (logger.transports.Console)());

// var SerialPort = require('serialport');
var port; //= new SerialPort(config.comPort, { autoOpen: false }); 


// Internal Dependencies
var token = require('./constants');
var codec = require('./codec');
var app = require('./app');

var isTransferState = false;
var isSender = false;

// Flag about chunked transfer.
var is_chunked_transfer = '';
//
var lastRecvData = '';

var _chunks = [];


var db = require('./dbsqlite');

function hasDataToSend(){
    // logger.info("Antes del Query");
    // db.getStatus(function(error, data){
        // logger.info(data.data_to_send);
        // if (data.data_to_send === 'True'){
            // return true;
        // }
        // else{
            // return true;
        // }
    // });
    return false;
}

function openCOMPort(){
    port.open(function (err) {
    if (err) {
        return logger.error('Error opening port: ', err.message);
    }
    });
}

function closeCOMPort(){
    port.open(function (err) {
    if (err) {
        return logger.error('Error opening port: ', err.message);
    }
    });
}

function initClient(){
    if (hasDataToSend){
        if (!isTransferState){
            closeCOMPort();
            openCOMPort();
            openSession();
        }
    }
    else{
        if (port.isOpen() && isTransferState){
            timeoutCommunication();
            port.closeCOMPort();
        }
        else{
            logger.info('Waiting for data to send');
        }
    }
}

function run(port){
    port = port;
    setInterval(initClient(), 10000);
};

function timeoutCommunication(){
    if (isTransferState){
        isTransferState = false;
    }
}


port.on('open', handlePortOpen);
port.on('close', handlePortClose);
port.on('data', handlePortData);
port.on('error', function(err) {
  logger.error(err.message);
})


function handlePortOpen() {
    logger.info('Port open. Data rate: ' + port.options.baudRate);
}

function handlePortClose() {
    logger.info('Port Closed.');
}

function handlePortData(data){
    logger.info(data); // Raw Buffer Data
    var data = data.toString('ascii');
    lastRecvData = data;
     
     if (!isTransferState){
         //initTimer
         readDataAsReceiver(data);
     }
     else{
         if (!isSender){
             readDataAsReceiver(data);
         }
         else{
             readDataAsSender(data);
         }
     }
}

/////// LOW LEVEL PROTOCOL- LINK LAYER ///////

function readDataAsReceiver(data){
    var response = '';
    
    if (data === token.ENQ){
        logger.info('Request: ENQ');
        if (!isTransferState){
            isTransferState = true;
            response = token.ACK;
        }
        else{
            logger.error('ENQ is not expected. Transfer state already.');
            response = token.NAK;
        }
    }
    else if (data === token.ACK){
        logger.error('ACK is not expected.');
        response = token.NAK;
    }
    else if (data === token.NAK){
        logger.error('NAK is not expected.');
        response = token.NAK;
    }
    else if (data === token.EOT){
        if (isTransferState){
            isTransferState = false;
            logger.info('EOT accepted. OK');
        }
        else{
            logger.error('Not ready to accept EOT message.');
            response = token.NAK;
        }
    }
    else if (data.startsWith(token.STX)){
        if (!isTransferState){
            discard_input_buffers();
            logger.error('Not ready to accept messages');
            response = token.NAK;
        }
        else{
            try{
                logger.info('Accept message.Handling message');
                handleMessage(data);
                response = token.ACK;
            }
            catch(err){
                logger.error('Error occurred on message handling.' + err)
                response = token.NAK;
            }
        }
    }
    else {
        logger.error('Invalid data');
        response = token.NAK;
    }
    
    port.write(response);
};

function handleMessage(message){
    is_chunked_transfer = codec.isChunkedMessage(message);
    if (is_chunked_transfer){
        logger.debug('handleMessage: Is chunked transfer.');
        _chunks.push(message);
    }
    else if (typeof _chunks !== 'undefined' && _chunks.length > 0){
        logger.debug('handleMessage: Previous chunks. This must be the last one');
        _chunks.push(message);
        dispatchMessage(_chunks.join(''),token.ENCODING);
        _chunks = [];
    }
    else{
        logger.debug('handleMessage: Complete message. Dispatching');
        dispatchMessage(message,token.ENCODING); 
    }
}

function dispatchMessage(message){
    var records = codec.decodeMessage(message,token.ENCODING);
    app.processRecords(records);
    // logger.debug(records);
    // TODO: Tratamiento de cada record
    
}

function discard_input_buffers(){ // TODO: Revisar si son necesarias todas las variables 
    _chunks = [];
    // _input_buffer = b('');
    // inbox.clear();
}

/////////////////// Client //////////////////////////

var dataChunks = []; 
var retryCounter = 0;
var lastSendOk = false;
var lastSendData = "";

function sendMessage(){
    if (lastSendData === token.ENQ){
        dataChunks = prepareMessage();
    }
    
    if (!lastSendOk){
        if (retryCounter > 6){
            closeSession();
            return;
        }
        else{
            retryCounter = retryCounter + 1;
        }
    }
    else{
        retryCounter = 0;
        lastSendData = dataChunks.shift();
    }
    if (dataChunks.length > 0){
        port.write(lastSendData);
        //initTimer
    }
    else{
        closeSession();
        return;
    }
}

function prepareMessage(){
    logger.debug('Prepare Message');
    var messageChunks = codec.encode(recordDataToSend);
    logger.debug(messageChunks);
    return messageChunks;
    
}

function readDataAsSender(data){
    
    if (data === token.ENQ){
        if (lastSendData === token.ENQ){
            //TODO: Link Contention??
        }
        throw new Error('Client should not receive ENQ.'); // TODO Que hacer con el error
    }
    else if (data === token.ACK){
        logger.debug('ACK Response'); // TODO: Remove line
        lastSendOk = true;
        try{ 
            sendMessage();
        }
        catch(error){
            logger.debug(error);
            closeSession();
        }
        //port.write(message); //self.push(message)
        // TODO: Revisar la condicion de abajo
        // if (message === token.EOT){
            // self.openSession()
        // }
    }
    else if (data === token.NAK){
        // Handles NAK response from server.

        // If it was received on ENQ request, the client tries to repeat last
        // request for allowed amount of attempts. For others it send callback
        // value :const:`False` to the emitter.
        // TODO: Reescribir comentarios sobre esta condicion
        logger.debug('NAK Response'); // TODO: Remove line
        if (lastSendData === token.ENQ){
            openSession();
        }
        else{
            try{
                lastSendOk = false;
                sendMessage();
            }
            catch(error){
                closeSession();
                // except StopIteration:
                    // self.closeSession(True)
                // except Exception:
                    // self.closeSession(True)
                // TODO: Si se dispone de tiempo analizar las excepciones anteriores 
            }
        }
        
        // TODO: Revisar la condicion de abajo
        // if message == EOT:
            // self.openSession()
    }
    else if (data === token.EOT){
        isTransferState = false; // TODO: Validar que ante un EOT se tengan que realizar estos pasos
        throw new Error('Client should not receive EOT.');
    }
    else if (data.startsWith(token.STX)){
        isTransferState = false; // TODO: Validar que ante un message se tengan que realizar estos pasos
        throw new Error('Client should not receive ASTM message.');
    }
    else {
        throw new Error('Invalid data.');
    }
}

function openSession(){
    logger.debug('Open Session'); // TODO: Remove line
    retryCounter = retryCounter + 1;
    if (retryCounter > 6){
        logger.debug('Exceed number of retries'); // TODO: Remove line
        closeSession();
    }
    else{
        port.write(token.ENQ);
        lastSendData = token.ENQ;
        isTransferState = true;
        isSender = true;
    }
}

function closeSession(){
    logger.debug('Close Session'); // TODO: Remove line
    port.write(token.EOT);
    isTransferState = false;
    isSender = false;
    retryCounter = 0;
}

var recordDataToSend = [ [ 'H',
    [ [null], [null,'&'] ],
    null,
    null,
    [ 'H7600', '1' ],
    null,
    null,
    null,
    null,
    'host',
    [ 'RSUPL', 'BATCH' ],
    'P',
    '1' ],
  [ 'P', '1' ],
  [ 'O',
    '1',
    [ '0', '                   806', '1', null, '001' ],
    'R1',
    [ null, null, null, '458/' ],
    'R',
    null,
    null,
    null,
    null,
    null,
    'N',
    null,
    [ null, null, null ],
    null,
    'SC',
    null,
    null,
    '      ',
    [ '                              ',
      '                         ',
      '                    ',
      '               ',
      '          ' ],
    null,
    null,
    '20161111095305',
    null,
    null,
    'F' ],
  [ 'R',
    '1',
    [ null, null, null, '458/' ],
    '55',
    'mg/dl',
    null,
    'N',
    null,
    'F',
    null,
    null,
    null,
    null,
    'P1' ],
  [ 'C', '1', 'I', '0', 'I' ],
  [ 'L', '1', 'N' ] ];
  
  // 0231487C5C5E267C7C7C48373630305E317C7C7C7C7C686F73747C525355504C5E42415443487C507C310D507C310D4F7C317C305E202020202020202020202020202020202020203830365E315E5E3030317C52317C5E5E5E3435382F7C527C7C7C7C7C7C4E7C7C5E5E7C7C53437C7C7C2020202020207C2020202020202020202020202020202020202020202020202020202020205E202020202020202020202020202020202020202020202020205E20202020202020202020202020202020202020205E2020202020202020202020202020205E202020202020202020207C7C7C32303136313131313039353330357C7C7C460D527C317C5E5E5E3435382F7C35357C6D672F646C7C7C4E7C7C467C7C7C7C7C50310D437C317C497C307C490D4C7C317C4E0D0342460D0A