var express = require('express')
    bodyParser = require('body-parser'),
    multiparty = require('connect-multiparty')
    mongodb = require('mongodb'),
    objectId = require('mongodb').ObjectId,
    fs = require('fs');
    mv = require('mv');

var app = express();

app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
app.use(multiparty());
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*" );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE" );
    res.setHeader("Access-Control-Allow-Headers", "content-type" );
    res.setHeader("Access-Control-Allow-Credentials", true );
    next();
})


var port = 8080;

var db = new mongodb.Db(
    'instagram',
    new mongodb.Server('localhost', 27017, {}),
    {}
);

app.listen(port);
console.log('======================================');
console.log('Servidor HTTP escutanto na porta: ' + port);
console.log('======================================');

app.get('/', function(req, res) {
    res.send({msg: 'Olá'});
})

//URI + HTTP
// POST(create)
app.post('/api', function (req, res) {

    var date = new Date();
    var time_stamp = date.getTime();

    var url_imagem = time_stamp + '-' + req.files.arquivo.originalFilename;

    var path_origem = req.files.arquivo.path;
    var path_destino = './uploads/' + url_imagem;

    // correção de problema de copiar arquivos entre partições diferentes
    // var readS = fs.createReadStream(path_origem);
    // var writeS = fs.createWriteStream(path_destino);
    // readS.pipe(writeS);

    // readS.on("end", function (err) {
    //     if (err) {
    //         res.status(500).json({ error: err });
    //         return;
    //     }

    //     var dados = {
    //         url_imagem: url_imagem,
    //         titulo: req.body.titulo
    //     }

    //     db.open(function (err, mongoclient) {
    //         mongoclient.collection('postagens', function (err, collection) {
    //             collection.insert(dados, function (err, records) {
    //                 if (err) {
    //                     res.json({ 'status': 'erro' });
    //                 } else {
    //                     res.json({ 'status': 'inclusao realizada com sucesso' });
    //                 }
    //                 mongoclient.close();
    //             });
    //         });
    //     });
    // });

    // Ou com a instalação o mv
    mv(path_origem, path_destino, function (err) {
        if (err) {
            res.status(500).json({ error: err });
            console.log('Errrooooo')
            return;
        }

        var dados = {
            url_imagem: url_imagem,
            titulo: req.body.titulo
        }

        db.open(function (err, mongoclient) {
            mongoclient.collection('postagens', function (err, collection) {
                collection.insert(dados, function (err, records) {
                    if (err) {
                        res.json({ 'status': 'erro' });
                    } else {
                        res.json({ 'status': 'inclusao realizada com sucesso' });
                    }
                    mongoclient.close();
                });
            });
        });

    });
});

//GET (ready)
app.get('/api', function (req, res) {
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.find().toArray(function(err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.json(results);
                }
                mongoclient.close();
            });
        });
    });
});

app.get('/imagens/:imagem', function(req, res) {

    var img = req.params.imagem;

    fs.readFile('./uploads/' + img , function(err, content) {
        if(err){
            res.status(400).json(err);
            return;
        }

        res.writeHead(200, {  'content-type': 'image/png' });
        res.end(content);
    })
})

//GET by ID (ready)
app.get('/api/:id', function (req, res) {
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.find(objectId(req.params.id)).toArray(function(err, results) {
                if (err) {
                    res.json(err);
                } else {
                    res.json(results);
                }
                mongoclient.close();
            });
        });
    });
});

//PUT by ID (update)
app.put('/api/:id', function (req, res) {
    // res.send(req.body.comentario);
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.update(
                { _id: objectId(req.params.id) },
                { $push: { comentarios: { id_comentario : new objectId(), comentario: req.body.comentario }}},
                {},
                function(err, records){
                    if(err){
                        res.json(err);
                    } else {
                        res.json(records);
                    }
                    mongoclient.close();
                }
             );
        });
    });
});

//DELETE by ID (remove)
app.delete('/api/:id', function (req, res) {
    
    db.open(function (err, mongoclient) {
        mongoclient.collection('postagens', function (err, collection) {
            collection.update(
                { }, 
                { $pull : {
                            comentarios : { id_comentario: objectId(req.params.id)}
                          }
                },
                { multi : true },
                function(err, records) {
                if (err) {
                        res.json(err);
                } else {
                        res.status(500).json(records);
                }
                mongoclient.close();     
            });
        });
    });
});