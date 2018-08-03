var logger = require('winston');
var SerialPort = require('serialport');

// Internal Dependencies
var config = require('./config');
var token = require('./constants');
var codec = require('./codec');
var app = require('./app');
var db = require('./db');

// Init logging
logger.level = config.logLevel;

// Global variables for Client and Server mode
var isTransferState = false;
var isClientMode = false;
var port = null; // COM Port Communication

init();

function init(){
    SerialPort.list(function(err, ports){
        initPort(err,ports);
    });
}

function initPort(err, ports){
    // var portNumber = ports[0].comName;
    var portNumber = 'COM6';
    port = new SerialPort(portNumber);
    port.on('open', handlePortOpen);
    port.on('close', handlePortClose);
    port.on('data', handlePortData);
    port.on('error', function(err) {
          logger.error(err.message);
      throw new Error('Port Error: ' + err.message);
    })
}


function handlePortOpen() {
    logger.info('Port open. Data rate: ' + port.options.baudRate);
}

function handlePortClose() {
    logger.info('Port Closed.');
}

function handlePortWrite(data){
    logger.info('RESPONSE'); 
    logger.info(data);
    port.write(data);
    initTimer();
}

function handlePortData(data){
    logger.info('REQUEST'); 
    logger.info(data); // Raw Buffer Data
    var data = data.toString('ascii');
     
     if (isTransferState){
         if (isClientMode){
             readDataAsClient(data);
         }
         else{
             readDataAsServer(data);
         }
     }
     else{
         readDataAsServer(data);
     }
}

////////////////// SERVER MODE //////////////////////

var inputChunks = [];

function readDataAsServer(data){
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
        throw new Error('ACK is not expected.');
    }
    else if (data === token.NAK){
        logger.error('NAK is not expected.');
        throw new Error('NAK is not expected.');
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
                response = token.ACK;
                handleMessage(data);
            }
            catch(err){
                logger.error('Error occurred on message handling.' + err)
                // response = token.NAK;
            }
        }
    }
    else {
        logger.error('Invalid data.');
        throw new Error('Invalid data.');
    }
    
    handlePortWrite(response);
};

function handleMessage(message){
    if (codec.isChunkedMessage(message)){
        logger.debug('handleMessage: Is chunked transfer.');
        inputChunks.push(message);
    }
    else if (typeof inputChunks !== 'undefined' && inputChunks.length > 0){
        logger.debug('handleMessage: Previous chunks. This must be the last one');
        inputChunks.push(message);
        dispatchMessage(inputChunks.join(''),token.ENCODING);
        inputChunks = [];
    }
    else{
        logger.debug('handleMessage: Complete message. Dispatching');
        dispatchMessage(message,token.ENCODING); 
    }
}

function dispatchMessage(message){
    console.log(message);
    var records = codec.decodeMessage(message);
    logger.info(records);
    app.processMessage(records);
}

function discard_input_buffers(){
    inputChunks = [];
}



////////////////// CLIENT MODE //////////////////////

var outputChunks = []; 
var outputMessages = []; 
var retryCounter = 0;
var lastSendOk = false;
var lastSendData = "";
var timer;

function readDataAsClient(data){
    
    if (data === token.ENQ){
        if (lastSendData === token.ENQ){
            //TODO: Link Contention??
        }
        throw new Error('Client should not receive ENQ.');
    }
    else if (data === token.ACK){
        logger.debug('ACK Response');
        lastSendOk = true;
        try{ 
            sendMessage();
        }
        catch(error){
            logger.debug(error);
            closeClientSession();
        }
    }
    else if (data === token.NAK){
        // Handles NAK response from server.

        // The client tries to repeat last
        // send for allowed amount of attempts. 
        logger.debug('NAK Response');
        if (lastSendData === token.ENQ){
            openClientSession();
        }
        else{
            try{
                lastSendOk = false;
                sendMessage();
            }
            catch(error){
                closeClientSession();
            }
        }
    }
    else if (data === token.EOT){
        isTransferState = false;
        throw new Error('Client should not receive EOT.');
    }
    else if (data.startsWith(token.STX)){
        isTransferState = false;
        throw new Error('Client should not receive ASTM message.');
    }
    else {
        throw new Error('Invalid data.');
    }
}

function prepareMessagesToSend(protocol){
    outputMessages = []; // Global variable
    outputMessages = app.composeOrderMessages(protocol);
}

function prepareNextEncodedMessage(){
    outputChunks = []; // Global variable
    outputChunks = codec.encode(outputMessages.shift());
}

function sendMessage(){
    if (lastSendData === token.ENQ){
        if (outputMessages.length > 0){
            // Still exists messages to send
            prepareNextEncodedMessage();
            sendData();
        }
        else{
            db.getNextProtocolToSend().then( function( results ) {
            for (var i = 0; i < results.length; i++) { // Always only 1 iteration
                var protocol = results[i]; 
                prepareMessagesToSend(protocol)
                prepareNextEncodedMessage();
                sendData();
            }
            }, function( err ) {
                logger.error( "Something bad happened:", err );
            } );
        }
    }
    else{
        sendData();
    }
}

function sendData(){
    if (!lastSendOk){
        if (retryCounter > 6){
            logger.error("Luego de probar 6 veces.... y falla");
            closeClientSession();
            if (lastSendData !== token.ENQ){
               // pone en fail le protocolo si tuvo algún problema
                db.setFailLastProtocolSent();
            }
            return;
        }
        else{
            logger.error("Dio fallo....contando: ", retryCounter);
            retryCounter = retryCounter + 1;
        }
    }
    else{
        retryCounter = 0;
        if (outputChunks.length > 0){
            lastSendData = outputChunks.shift();
        }
        else{
            closeClientSession();
            if (outputMessages.length > 0){
                openClientSession();
            }
            else{
                // Borra el protocolo si lo mando ok
                logger.error("Va a borrar el protocolo de la tabla porque pasó ok");
                db.removeLastProtocolSent();
            }
            
            return;
        }
    }
    handlePortWrite(lastSendData);
}


function openClientSession(){
    logger.info('Open Client Session');
    retryCounter = retryCounter + 1;
    if (retryCounter > 6){
        logger.error('Exceed number of retries');
        closeClientSession();
    }
    else{
        handlePortWrite(token.ENQ);
        lastSendData = token.ENQ;
        isTransferState = true;
        isClientMode = true;
    }
}

function closeClientSession(){
    logger.debug('Close Client Session');
    handlePortWrite(token.EOT);
    isTransferState = false;
    isClientMode = false;
    retryCounter = 0;
}

function checkDataToSend(){
    db.hasProtocolsToSend().then( function( results ) {
        if (results[0].total > 0){
            logger.info("Exist data to send");
            if (!isClientMode){
                openClientSession();
            }
        }
        else{
            if (isClientMode){
            isClientMode = false;
            }
            else{
                return;
                logger.info('Waiting for data to send');
            }
        }
    }, function( err ) {
        logger.error( "Something bad happened:", err );
    } );
}

function initTimer(){
    clearTimeout(timer);
    timer = setTimeout(timeoutCommunication,5000);
}

function timeoutCommunication(){
    if (isTransferState){
        throw new Error('Timeout Communication');
    }
}

function runIntervalCheck() {
  setInterval(checkDataToSend, 10000);
};


runIntervalCheck();