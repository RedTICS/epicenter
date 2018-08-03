var logger = require('winston');
// Internal Dependencies
var token = require('./constants');

    
function isDigit(num){
    return !isNaN(num)
}

/**
* Common ASTM decoding function that tries to guess which kind of data it
* handles.
* If `data` starts with STX character (``0x02``) then probably it is
* full ASTM message with checksum and other system characters.
* If `data` starts with digit character (``0-9``) then probably it is
* fraime of records leading by his sequence number. No checksum is expected
* in this case.
* Otherwise it counts `data` as regular record structure.
* @param data: ASTM data object.
* @return: Array of ASTM records.
**/
function decode(data){
    if (data.startsWith(token.STX)){ // # may be decode message \x02...\x03CS\r\n
        var records = decode_message(data);
        return records;
    }
    var bait =  data.slice(0,1).toString(token.ENCODING);
    if  (isDigit(bait)){
        var records = decodeFrame(data);
        return records;
    }
    // Maybe is a record
    var salida = [];
    return decodeRecord(data);

    
}


/**
* Decodes complete ASTM message that is sent or received due
* communication routines. It should contains checksum that would be
* additionally verified.
*
* @param {string} message: ASTM message.
* @returns: Array of records

* @throws Error:
* * If ASTM message is malformed.
* * If checksum verification fails. TODO
**/
function decodeMessage(message){
    if (!(message.startsWith(token.STX) && message.endsWith(token.CRLF))){
        throw new Error('Malformed ASTM message. Expected that it will started with STX and followed by CRLF characters. Got:' + message);
    }
    
    var STXIndex = -1;
    var fraimeMerge = [];
    var fraime = "";
    var msg = message.slice(1); // Remove first STX
    while (msg.indexOf(token.STX) > -1 ){
        STXIndex = msg.indexOf(token.STX);
        fraime = message.slice(0,STXIndex + 1);
        fraime = decodeFrame(fraime);
        fraimeMerge.push(fraime);
        
        msg = msg.slice(STXIndex + 1);
        message = message.slice(STXIndex + 1);
    }

    fraime = decodeFrame(message); // Last frame(should contains ETX)
    fraimeMerge.push(fraime);
    
    var records = fraimeMerge.join("");
    
    var recordsArray = records.split(token.RECORD_SEP);
    
    var records = [];
    for (var i = 0; i < recordsArray.length; i++) {
        records.push(decodeRecord(recordsArray[i]));
    }
    return records
}

function decodeFrame(fraime){
    // Decodes ASTM frame 
    fraime = fraime.slice(1);
    var fraime_cs = fraime.slice(0,-2);
    fraime = fraime_cs.slice(0,-2);
    var cs = fraime_cs.slice(-2);
    var css = makeChecksum(fraime);
    
    // TODO Validate checksum
    // if (cs !== css){
        // throw new Error('Checksum failure: expected ' + cs + ', calculated '+ css); 
    // }
    
    if (fraime.endsWith(token.CR + token.ETX)){
        fraime = fraime.slice(0,-2);
    }
    else if (fraime.endsWith(token.ETB)){
        fraime = fraime.slice(0,-1);
    }
    else{
        throw new Error('Incomplete frame data ' + fraime + '. Expected trailing <CR><ETX> or <ETB> chars');
    }
    var seq = fraime.slice(0,1);
    if (!isDigit(seq)){
        throw new Error('Malformed ASTM frame. Expected leading seq number '+ fraime);
    }
    return fraime.slice(1);
}


function decodeRecord(record){
    // Decodes ASTM record message
    var fields = [];
    var fieldsArray = record.split(token.FIELD_SEP);
    for (var i = 0; i < fieldsArray.length; i++) {
        var item = fieldsArray[i];
        if (item.indexOf(token.REPEAT_SEP)> -1){
            item = decodeRepeatedComponent(item);
        }
        else if (item.indexOf(token.COMPONENT_SEP)> -1){
            item = decodeComponent(item);
        }
        else{
            item = item;
        }
        
        if (item){
            fields.push(item);
        }
        else{
            fields.push(null);
        }
    }
    return fields;
}


function decodeComponent(field){
    // Decodes ASTM field component
    var outComponents = [];
    var itemsArray = field.split(token.COMPONENT_SEP);
     
    for (var i = 0; i < itemsArray.length; i++) {
        var item = itemsArray[i];
        if (item){
            outComponents.push(item);
        }
        else{
            outComponents.push(null);
        }
    }
    return outComponents;
}

function decodeRepeatedComponent(component){
    // Decodes ASTM field repeated component
    var outRepeatedComponent = [];
    var itemsArray = component.split(token.REPEAT_SEP);
    for (var i = 0; i < itemsArray.length; i++) {
        var item = itemsArray[i];
        outRepeatedComponent.push(decodeComponent(item));
    }
    outRepeatedComponent;
    return outRepeatedComponent
}




/**
* Encodes list of records into single ASTM message, also called as "packed"
* message.
* 
* If the result message is too large (greater than specified `size` if it's
* not null), then it will be split by chunks.
*
* @param records: Array of ASTM records.
* @param {int} size: Chunk size in bytes.
* @param {int} seq: Frame start sequence number.
* @return: List of ASTM message chunks.
**/
function encode(records, encoding, size, seq){
    encoding = typeof encoding !== 'undefined' ? encoding : token.ENCODING;
    seq = typeof seq !== 'undefined' ? seq : 1;
    size = typeof size !== 'undefined' ? size : 247;
    var msg = encodeMessage(seq, records, encoding);

    if (size && msg.length > size){
        return split(msg, size);
    }
    return [msg];
}


            
/**
* Encodes ASTM message.
* @param {int} seq: Frame sequence number.
* @param records: List of ASTM records.
* @param {string} encoding: Data encoding.
* @return {string}: ASTM complete message with checksum and other control characters.
**/
function encodeMessage(seq, records, encoding){
    var data = [];
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        // logger.info(record);
        data.push(encodeRecord(record,encoding));
    }
    // logger.info(data);
    data = data.join(token.RECORD_SEP);
    data = [(seq % 8) , data, token.CR, token.ETX].join('');
    return [token.STX, data, makeChecksum(data), token.CR, token.LF].join('');
}

/**
* Encodes single ASTM record.
* @param record: ASTM record. Each`string`-typed item counted as field
               * value, one level nested `array` counted as components
               * and second leveled - as repeated components.
* @param {string} encoding: Data encoding.
* @returns {string}: Encoded ASTM record.
**/
function encodeRecord(record, encoding){
    var fields = [];
    
    for (var i = 0; i < record.length; i++) {
        var field = record[i];
        if (typeof field === 'bytes'){
            fields.push(field);
        }
        else if (typeof field === 'string'){
            fields.push(field);
        }
        else if (Object.prototype.toString.call(field) === '[object Array]'){
            fields.push(encodeComponent(field, encoding));
        }
        else if(typeof field === 'undefined' || field === null){
            fields.push('');
        }
        else{
            fields.push(field);
        }
    }
    return fields.join(token.FIELD_SEP); 
}

function encodeComponent(component, encoding){
    // Encodes ASTM record field components
    var items = [];
    for (var i = 0; i < component.length; i++) {
        var item = component[i];
        if (typeof item === 'bytes'){
            items.push(item);
        }
        else if (typeof item === 'string'){
            items.push(item);
        }
        else if (Object.prototype.toString.call(item) === '[object Array]'){
            items.push(encodeRepeatedComponent(component, encoding));
            break;
        }
        else if(typeof item === 'undefined' || item === null){
            items.push('');
        }
        else{
            items.push(item);
        }
    }
     
    return items.join(token.COMPONENT_SEP);
}


function encodeRepeatedComponent(components, encoding){
    // Encodes repeated components
    var items = []
    for (var i = 0; i < components.length; i++) {
        var item = components[i];
        items.push(encodeComponent(item,encoding));
    }
    return items.join(token.REPEAT_SEP);

}

/**
* Merges ASTM message `chunks` into single message.
* @param chunks: List of chunks as `bytes`.
**/
function joinChunks(chunks){
    var msg = '1';
    var chunksMsg = [];
    for (var i = 0; i < chunks.length; i++) {
        var dataChunk = chunks[i].slice(2,-5);
        chunksMsg.push(dataChunk);
    }
    msg = msg + chunksMsg.join('') + token.ETX;
    var completeMsg = [token.STX, msg, makeChecksum(msg), token.CRLF]
    return completeMsg.join('');
}

/**
* Split `msg` into chunks with specified `size`.
*
* Chunk `size` value couldn't be less then 7 since each chunk goes with at
* least 7 special characters: STX, frame number, ETX or ETB, checksum and
* message terminator.
*
* @param msg: ASTM message.
* @param {int }size: Chunk size in bytes.
* :yield: `bytes`
**/
function split(msg, size){
    var outputChunks = [];
    var frame = parseInt(msg.slice(1,2));
    var msg = msg.slice(2,-6);
    if (size === null || size < 7){
        throw new Error('Chunk size value could not be less then 7 or null');
    }
    var chunks = make_chunks(msg, size - 7);
    var firstChunks = chunks.slice(0,-1);
    var last = chunks.slice(-1);
    var idx = 0
    for(var i = 0; i < firstChunks.length; i++){
        idx = i;
        var chunk = firstChunks[idx];
        var item = ([((idx + frame) % 8),chunk,token.ETB]).join('');
        outputChunks.push(([token.STX,item,makeChecksum(item),token.CRLF]).join(''));
    }
    item = ([((idx + frame + 1) % 8),last,token.CR,token.ETX]).join('');
    outputChunks.push(([token.STX,item,makeChecksum(item),token.CRLF]).join(''));
    return outputChunks;
}

function make_chunks(msg, size){
    chunks = [];
    iterElems = [];
    for(var i = 0; i < msg.length; i++){
        iterElems.push(msg.slice(i,i+1));
    }
    while(iterElems.length) {
        chunks.push(iterElems.splice(0,size).join(''));
    }
    return chunks;
}


function isChunkedMessage(message){
    //  Checks plain message for chunked byte.
    if (message.length < 5){
        return false;
    }
    var ETBIndex = message.indexOf(token.ETB);
    
    if (ETBIndex > -1){
        if (ETBIndex === message.length -5 ){
            return true;
        }
        else{
            return false;
        }
    }
    else{
        return false;
    }
}

/**
* Calculates checksum for specified message.
* @param message: ASTM message.
* @returns: Checksum value in hex base
**/
function makeChecksum(message){
    var sumData = []
    for(var i = 0; i < message.length; i++){
        sumData.push(message.charCodeAt(i));
    }
    var suma = sumData.reduce((a, b) => a + b, 0) & 0xFF;
    return zfill(suma.toString(16).toUpperCase());
}

function zfill(value){
    var str = "" + value;
    var pad = "00";
    return ans = pad.substring(0, pad.length - str.length) + str;
}

module.exports = {
    decode: decode,
    decodeMessage : decodeMessage,
    decodeFrame : decodeFrame,
    decodeRecord : decodeRecord,
    decodeComponent : decodeComponent,
    decodeRepeatedComponent : decodeRepeatedComponent,
    encode: encode,
    encodeMessage: encodeMessage,
    encodeRecord: encodeRecord,
    isChunkedMessage: isChunkedMessage,
    joinChunks: joinChunks,
    makeChecksum : makeChecksum,
    zfill: zfill,
};