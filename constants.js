'use strict';


var ENCODING = 'ascii';
// Message start token.
var STX = '\x02';
// Message end token.
var ETX = '\x03';
// ASTM session termination token.
var EOT = '\x04';
// ASTM session initialization token.
var ENQ = '\x05';
// Command accepted token.
var ACK = '\x06';
// Command rejected token.
var NAK = '\x15';
// Message chunk end token.
var ETB = '\x17';
var LF  = '\x0A';
var CR  = '\x0D';
// CR + LF shortcut.
var CRLF = CR + LF;

// Message records delimiter.
var RECORD_SEP    = '\x0D'; // \r //
// Record fields delimiter.
var FIELD_SEP     = '\x7C'; // |  //
// Delimeter for repeated fields.
var REPEAT_SEP    = '\x5C'; // \  //
// Field components delimiter.
var COMPONENT_SEP = '\x5E'; // ^  //
// Date escape token.
var ESCAPE_SEP    = '\x26'; // &  //

module.exports = {
    ENCODING: ENCODING,
    STX : STX,
    ETX : ETX,
    EOT : EOT,
    ENQ : ENQ,
    ACK : ACK,
    NAK : NAK,
    ETB : ETB,
    LF  : LF,
    CR  : CR,
    CRLF :CRLF,
    RECORD_SEP    : RECORD_SEP,
    FIELD_SEP     : FIELD_SEP,
    REPEAT_SEP    : REPEAT_SEP,
    COMPONENT_SEP : COMPONENT_SEP,
    ESCAPE_SEP    : ESCAPE_SEP
};
