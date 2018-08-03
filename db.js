var config = require('./config');
var record = require("./record_epicenter");

var logger = require('winston');
var sql = require("seriate");

// SQL Server config settings
var dbConfig = {  
    "server": config.dbServer,
    "user": config.dbUser,
    "password": config.dbPassword,
    "database": config.dbDatabase
};

sql.setDefaultConfig( dbConfig );

function saveResultGND(result, order){
    return new Promise(
        function (resolve, reject) {

            var logTime = new Date();
            var resultado = '';
            switch (result.testStatus){
                case "INST_POSITIVE": resultado = 'Positivo'; break;
                case "INST_NEGATIVE": resultado = 'Negativo'; break;
            }
            if (resultado != ''){
                    getProtocolByNro(order.accessionNumber).then( function( results ) {
                    if (results[0]){
                        protocolId = results[0].idProtocolo;
                        sql.getPlainContext()
                        .step( "queryDetalleProtocolByProtocolId", function( execute, data ) {
                            logger.info('queryDetalleProtocolByProtocolId...');
                            execute( {
                                query: "SELECT TOP 1 idDetalleProtocolo FROM lab_DetalleProtocolo WHERE idProtocolo = @_protocolId " +
                                    "AND idSubItem IN(2204, 3216, 3220) AND resultadoCar='' ORDER BY idSubItem",
                                params: {
                                    _protocolId: { type: sql.INT, val: protocolId },
                                }
                            } );
                        } )
                        .end( function( sets ){
                            if (!sets.queryDetalleProtocolByProtocolId[0]){
                                errMessage = 'No se encontro el detalle del protocolo con numero de protocolo:' + protocolId;
                                logger.error(errMessage);
                                logMessages(errMessage,logTime);
                                throw new Error(errMessage);
                            }
                            var idDetalleProtocolo = sets.queryDetalleProtocolByProtocolId[0].idDetalleProtocolo;
                            sql.execute( {
                                query: "UPDATE lab_DetalleProtocolo set resultadoCar = @_resultado WHERE idDetalleProtocolo = @_idDetalleProtocolo",
                                params: {
                                    _idDetalleProtocolo: { type: sql.INT, val: idDetalleProtocolo },
                                    _resultado: { type: sql.NVARCHAR, val: resultado },
                                }
                            } ).then( function( results ) {
                                logger.info('Guardando GND....');
                                logger.info( results );
                                resolve();
                            }, function( err ) {
                                logger.error( "Something bad happened:", err );
                                reject();
                            } );
                            
                            logger.info('lab_DetalleProtocolo actualizado con ProtocolId:', protocolId);
                        } )
                        .error( function( err ){
                            logger.error( err );
                            logMessages(errMessage,logTime);
                            reject();
                        } ); 
                    }
                    else{
                        errMessage = 'No se encontro el protocolo especificado con id:' + order.accessionNumber;
                        logger.error(errMessage);
                        logMessages(errMessage,logTime);
                        reject();
                    }
            
                    }, function( err ) {
                    logger.error( "Something bad happened:", err );
                    reject()
                } );
            }
            else{
                reject();
            }
        }
    );
}

function saveResultAST(result,order){
    return new Promise(
        function (resolve, reject) {
            getGermenByCodigo(order.organism).then( function( results ) {
                if (results[0]){
                    insertResultAST(result, order).then( function() {
                        resolve();
                    }, function( err ) {
                        logger.error( "Something bad happened:", err );
                        reject();
                    } );

                }
                else{
                    logger.info('Se intentará insertar el nuevo germen:'+ order.organism);
                    insertGermen(order.organism).then( function( results ) {
                        insertResultAST(result, order).then( function() {
                            resolve();
                        }, function( err ) {
                            logger.error( "Something bad happened:", err );
                            reject();
                        } );

                    }, function( err ) {
                        logger.error( "Something bad happened:", err );
                        errMessage = 'No se pudo insertar el  germen con codigo:' + codigoGermen;
                        logMessages(errMessage,logTime);
                        throw new Error(errMessage);
                    } );
                }
            }, function( err ) {
                logger.error( "Something bad happened:", err );
                reject()
            } );
        }
    );
};


function insertResultAST(result,order){
    return new Promise(
        function (resolve, reject) {
            var logTime = new Date();
            getProtocolByNro(order.accessionNumber).then( function( results ) {
                if (results[0]){
                    protocolId = results[0].idProtocolo;
                    sql.getPlainContext()
                        .step( "queryAntibioticByName", {
                            query: "SELECT TOP 1 idAntibiotico FROM LAB_Antibiotico WHERE nombreCorto = @_antibiotic AND baja=0",
                            params: {
                                _antibiotic: { type: sql.NVARCHAR, val: result.antibiotic }
                            }
                        } )
                        .step( "queryProtocoloGermenByProtocolId", function( execute, data ) {
                            execute( {
                                query: "SELECT TOP 1 idProtocoloGermen,atb FROM lab_ProtocoloGermen WHERE idProtocolo = @_protocolId",
                                params: {
                                    _protocolId: { type: sql.INT, val: protocolId },
                                }
                            } );
                        } )
                        .step( "queryGermenByCodigo", function( execute, data ) {
                            logger.info('queryGermenByCodigo. Ultimo intento');
                            execute( {
                                query: "SELECT TOP 1 idGermen FROM LAB_Germen WHERE codigo = @_organism AND baja=0",
                                params: {
                                    _organism: { type: sql.NVARCHAR, val: order.organism } // Organism take from Order (not Result as ID Results)
                                }
                            } );
                        } )
                        .step( "queryDetalleProtocolByProtocolId", function( execute, data ) {
                            logger.info('queryDetalleProtocolByProtocolId...');
                            execute( {
                                query: "SELECT TOP 1 idItem FROM lab_DetalleProtocolo WHERE idProtocolo = @_protocolId",
                                params: {
                                    _protocolId: { type: sql.INT, val: protocolId },
                                }
                            } );
                        } )
                        .end( function( sets ){
                            if (!sets.queryDetalleProtocolByProtocolId[0]){
                                errMessage = 'No se encontro el detalle del protocolo con numero de protocolo:' + protocolId;
                                logger.error(errMessage);
                                logMessages(errMessage,logTime);
                                throw new Error(errMessage);
                            }
                            if (!sets.queryGermenByCodigo[0]){
                                errMessage = 'No se encontro el germen con codigo:' + order.organism;
                                logger.error(errMessage);
                                logMessages(errMessage,logTime);
                                throw new Error(errMessage);
                            }
                            
                            var idItem = sets.queryDetalleProtocolByProtocolId[0].idItem;
                            var idGermen = sets.queryGermenByCodigo[0].idGermen;

                            if (!sets.queryAntibioticByName[0]){
                                errMessage = 'No se encontro el antibiotico con nombre:' + result.antibiotic;
                                logger.error(errMessage);
                                logMessages(errMessage,logTime);
                                resolve();
                                // throw new Error(errMessage);
                            }
                            if (sets.queryProtocoloGermenByProtocolId[0]){
                                var idProtocoloGermen = sets.queryProtocoloGermenByProtocolId[0].idProtocoloGermen;
                                var atb = sets.queryProtocoloGermenByProtocolId[0].atb;
                                if (!atb || atb==0){
                                    sql.execute( {
                                        query: "UPDATE lab_ProtocoloGermen set atb=1 WHERE idProtocoloGermen= @_idProtocoloGermen",
                                        params: {
                                            _idProtocoloGermen: { type: sql.INT, val: idProtocoloGermen },
                                        }
                                    } );
                                }
                            }
                            
                            var idAntibiotico = sets.queryAntibioticByName[0].idAntibiotico;
                            var resultado = "";
                            var susceptibility = "";
                            switch (result.code){
                                case "AST": susceptibility = result.ASTsusceptibilityFinal; break;
                                case "AST_MIC": susceptibility = result.ASTsusceptibilityInterpreted; break;
                            } 

                            // var idGermen = sets.queryGermenByCodigo[0].idGermen;
                            switch (susceptibility){
                                case "S": resultado = "Sensible"; break;
                                case "I": resultado = "Intermedio"; break;
                                case "R": resultado = "Resistente";  break;
                                case "N": resultado = "No sensible"; break;
                                case "X": resultado = "Error"; break;
                            } 
                            
                            sql.execute( {
                                query: "INSERT INTO LAB_Antibiograma (" +
                                    "idEfector,idProtocolo,numeroAislamiento,idGermen,idAntibiotico," +
                                    "resultado,idUsuarioRegistro,fechaRegistro,idUsuarioValida,fechaValida," +
                                    "idItem,idMetodologia,valor) VALUES (" +
                                    "@_idEfector,@_idProtocolo,@_numeroAislamiento,@_idGermen,@_idAntibiotico," +
                                    "@_resultado,@_idUsuarioRegistro,@_fechaRegistro,@_idUsuarioValida,@_fechaValida," +
                                    "@_idItem,@_idMetodologia,@_valor)",
                                params: {
                                    _idEfector: { type: sql.INT, val: 205 },
                                    _idProtocolo: { type: sql.INT, val: protocolId },
                                    _numeroAislamiento: { type: sql.INT, val: order.isolateNumber },
                                    _idGermen: { type: sql.INT, val: idGermen }, // TODO Determinar si es correcto este dato
                                    _idAntibiotico: { type: sql.INT, val: idAntibiotico },
                                    _resultado: { type: sql.NVARCHAR, val: resultado},
                                    _idUsuarioRegistro: { type: sql.INT, val: 0 },                            
                                    _fechaRegistro: { type: sql.DATETIME, val: new Date() },                            
                                    _idUsuarioValida: { type: sql.INT, val: 0 },                            
                                    _fechaValida: { type: sql.DATETIME, val: new Date() },                            
                                    _idItem: { type: sql.INT, val: idItem }, // TODO Determinar si es correcto este dato
                                    _idMetodologia: { type: sql.INT, val: 1 },                            
                                    _valor: { type: sql.NVARCHAR, val: result.minimumInhibitoryConcentration }, // TODO Validar que sea esa campo para AST Results
                                }
                            } ).then( function( results ) {
                                logger.info('Guardando....');
                                logger.info( results );
                                resolve();
                            }, function( err ) {
                                logger.error( "Something bad happened:", err );
                                reject();
                            } );
                            
                            logger.info('LAB_Antibiograma actualizado con ProtocolId:', protocolId);
                        

                        } )
                        .error( function( err ){
                            logger.error( err );
                            logMessages(errMessage,logTime);
                            reject();
                        } ); 
                }
                else{
                    errMessage = 'No se encontro el protocolo especificado con id:' + order.accessionNumber;
                    logger.error(errMessage);
                    logMessages(errMessage,logTime);
                    throw new Error(errMessage);
                }

                }, function( err ) {
                logger.error( "Something bad happened:", err );
                reject();
            } );
        });
    }


function saveResultID(result,order){
    return new Promise(
        function (resolve, reject) {
            logger.info('Saving ID results...');
            var logTime = new Date();
            logger.info('queryGermenByCodigo. Primer intento.');
            getGermenByCodigo(result.organism).then( function( results ) {
                if (results[0]){
                    insertResultID(result, order).then( function() {
                        resolve();
                    }, function( err ) {
                        logger.error( "Something bad happened:", err );
                        reject();
                    } );
                }
                else{
                    logger.info('Se intentará insertar el nuevo germen:' + result.organism)
                    insertGermen(result.organism).then( function( results ) {
                        insertResultID(result, order).then( function() {
                            resolve();
                        }, function( err ) {
                            logger.error( "Something bad happened:", err );
                            reject();
                        } );
                    }, function( err ) {
                        logger.error( "Something bad happened:", err );
                        errMessage = 'No se pudo insertar el  germen con codigo:' + codigoGermen;
                        logMessages(errMessage,logTime);
                        throw new Error(errMessage);
                    } );
                }
            }, function( err ) {
                logger.error( "Something bad happened:", err );
                reject();
            } );


        }
    );
}

function insertResultID(result, order){
    return new Promise(
        function (resolve, reject) {
            var logTime = new Date();
            return getProtocolByNro(order.accessionNumber).then( function( results ) {
                if (results[0]){
                    protocolId = results[0].idProtocolo;
                    logger.info('queryGermenByCodigo. Ultimo intento');
                    sql.getPlainContext()
                    .step( "queryGermenByCodigo", {
                        query: "SELECT TOP 1 idGermen FROM LAB_Germen WHERE codigo = @_organism AND baja=0",
                        params: {
                            _organism: { type: sql.NVARCHAR, val: result.organism }
                        }
                    } )
                    .step( "queryDetalleProtocolByProtocolId", function( execute, data ) {
                        logger.info('queryDetalleProtocolByProtocolId...');
                        execute( {
                            query: "SELECT TOP 1 idItem FROM lab_DetalleProtocolo WHERE idProtocolo = @_protocolId",
                            params: {
                                _protocolId: { type: sql.INT, val: protocolId },
                            }
                        } );
                    } )
                    .end( function( sets ){
                        if (!sets.queryDetalleProtocolByProtocolId[0]){
                            errMessage = 'No se encontro el detalle del protocolo con numero de protocolo:' + protocolId;
                            logger.error(errMessage);
                            logMessages(errMessage,logTime);
                            throw new Error(errMessage);
                        }
                        if (!sets.queryGermenByCodigo[0]){
                            errMessage = 'No se encontro el germen con codigo:' + result.organism;
                            logger.error(errMessage);
                            logMessages(errMessage,logTime);
                            throw new Error(errMessage);
                        }
                        var idGermen = sets.queryGermenByCodigo[0].idGermen;
                        var idItem = sets.queryDetalleProtocolByProtocolId[0].idItem;
                        
                        sql.execute( {
                            query: "INSERT INTO LAB_ProtocoloGermen (" +
                                "idProtocolo, numeroAislamiento, idGermen, atb, observaciones, baja," +
                                "idUsuarioRegistro, fechaRegistro, idItem) VALUES (" +
                                "@_idProtocolo, @_numeroAislamiento, @_idGermen, 0, @_observaciones, 0," + 
                                "@_idUsuarioRegistro, @_fechaRegistro, @_idItem)",
                            params: {
                                _idProtocolo: { type: sql.INT, val: protocolId },
                                _numeroAislamiento: { type: sql.INT, val: order.isolateNumber },
                                _idGermen: { type: sql.INT, val: idGermen },
                                _observaciones: { type: sql.NVARCHAR, val:'' },
                                _idUsuarioRegistro: { type: sql.INT, val: 0 },
                                _fechaRegistro: { type: sql.DATETIME, val: new Date()},
                                _idItem: { type: sql.INT, val: idItem },                            
                            }
                        } ).then( function( results ) {
                            logger.info('Guardando....');
                            logger.info( results );
                            resolve();
                        }, function( err ) {
                            logger.error( "Something bad happened:", err );
                            reject();
                        } );
                        
                        logger.info('LAB_ProtocoloGermen actualizado con ProtocolId:', protocolId);
                    } )
                    .error( function( err ){
                        logger.error( err );
                        logMessages(errMessage,logTime);
                        reject();
                    } ); 
                }
                else{
                    errMessage = 'No se encontro el protocolo especificado con id:' + order.accessionNumber;
                    logger.error(errMessage);
                    logMessages(errMessage,logTime);
                    throw new Error(errMessage);
                }
        
                }, function( err ) {
                logger.error( "Something bad happened:", err );
                reject();
            } );
        }
    );
}

function insertGermen(codigoGermen){
    return sql.execute( {
        query: "INSERT INTO LAB_Germen (" +
            "idEfector, codigo, nombre, idUsuarioRegistro, fechaRegistro, baja) VALUES (" +
            "@_idEfector, @_codigo, @_nombre, @_idUsuarioRegistro, @_fechaRegistro, @_baja)",
        params: {
            _idEfector: { type: sql.INT, val: 205 },
            _codigo: { type: sql.NVARCHAR, val: codigoGermen },
            _nombre: { type: sql.NVARCHAR, val: 'Codigo:'+codigoGermen +'.Nombre Generado por Interface LIS/Epicenter. Reemplazar' },
            _idUsuarioRegistro: { type: sql.INT, val: 2 },
            _fechaRegistro: { type: sql.DATETIME, val: new Date()},
            _baja: { type: sql.INT, val: 0 },
        }
    } )
}

function getGermenByCodigo(codigoGermen){
    return sql.execute( {  
        query: "SELECT TOP 1 idGermen FROM LAB_Germen WHERE codigo = @_organism AND baja=0",
        params: {
            _organism: { type: sql.NVARCHAR, val: codigoGermen }
        }
    } )
}

function getProtocolByNro(nroProtocolo){
    return sql.execute( {  
        query: "SELECT TOP 1 idProtocolo FROM LAB_Protocolo WHERE numero = @_nroProtocolo AND baja=0 AND estado<2",
        params: {
            _nroProtocolo: {type: sql.INT, val: nroProtocolo}
        }
    } )
}

function hasProtocolsToSend(){
    return sql.execute( {  
        query: "SELECT count(*) as total FROM LAB_TempProtocoloEnvio WHERE equipo = @equipo",
        params: {
            equipo: {
                type: sql.NVARCHAR,
                val: config.analyzer,
            }
        }
    } )
    
}

function getNextProtocolToSend(){
    return sql.execute( {  
        query: "SELECT TOP 1 * FROM LAB_TempProtocoloEnvio WHERE equipo = @equipo and fail = 0",
        params: {
            equipo: {
                type: sql.NVARCHAR,
                val: config.analyzer,
            }
        }
    } )
}

function removeLastProtocolSent(){
    getNextProtocolToSend().then( function( results ) {
        for (var i = 0; i < results.length; i++) { // Always only 1 iteration
            var protocol = results[i]; 
            // removeProtocol(protocol.idTempProtocoloEnvio);
            // hacemos esto de forma temporal para ver si actualiza el protocolo que no se envía en vez de borrarlo
            failProtocol(protocol.idTempProtocoloEnvio);
        }
        }, function( err ) {
            logger.error( "Something bad happened:", err );
        } );
}

function removeProtocol(idTempProtocolo){
    return sql.execute( {  
        query: "DELETE FROM LAB_TempProtocoloEnvio WHERE idTempProtocoloEnvio = @_id",
        params: {
            _id: {
                type: sql.INT,
                val: idTempProtocolo,
            }
        }
    } )
}

function failProtocol(idTempProtocolo){
    return sql.execute( {  
        query: "UPDATE LAB_TempProtocoloEnvio SET fail=1 WHERE idTempProtocoloEnvio = @_id",
        params: {
            _id: {
                type: sql.INT,
                val: idTempProtocolo,
            }
        }
    } )
}


function logMessages(logMessage,logTime){
    sql.execute( {  
        query: "INSERT INTO Temp_Mensaje(mensaje,fechaRegistro) VALUES (@_mensaje,@_fechaRegistro)",
        params: {
            _mensaje: { type: sql.NVARCHAR, val: logMessage},
            _fechaRegistro: { type: sql.DATETIME, val: logTime},
        }
    } ).then( function( results ) {
        logger.info( results );
    }, function( err ) {
        logger.error( "Something bad happened:", err );
    } );
    
}


module.exports = {
    saveResultID: saveResultID,
    saveResultAST: saveResultAST,
    hasProtocolsToSend: hasProtocolsToSend,
    getNextProtocolToSend: getNextProtocolToSend,
    removeProtocol: removeProtocol,
    failProtocol: failProtocol,
    removeLastProtocolSent: removeLastProtocolSent,
    saveResultGND : saveResultGND
};