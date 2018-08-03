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

initPort();

function initPort(){
    var portNumber = 'COM1';
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
    logger.info('REQUEST A'); 
    logger.info(data);
    port.write(data);
}

function handlePortData(data){
    logger.info('RESPONSE B'); 
    logger.info(data); // Raw Buffer Data
}

function write(){
    handlePortWrite('Hola');
}

function runIntervalCheck() {
  setInterval(write, 10000);
};


runIntervalCheck();