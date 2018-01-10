//Search GET with $GET and POST with $POST

const express = require('express')
const requestIp = require('request-ip')
const request = require('request')
const StellarSdk = require('stellar-sdk')
const mongo = require('mongodb')
const path = require('path')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser');
const session = require('express-session')

//DB_SETTING
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://heroku_h8r3m961:868bro8g1ei4e7psrk0ffumh7o@ds247007.mlab.com:47007/heroku_h8r3m961";
var dbase;

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  dbase = db.db("heroku_h8r3m961");
})
                           

//GLOBAL VARIABLES
var global_param;
var pKey;
var sKey;
var balanceAmount;
var sess = {
    secret: 'requestTry_newAccount',
    resave: false,
    saveUninitialized: true,
    cookie: {}
}

//GLOBAL ALTERTS
function global_states(params) {
  var global_states = {
    success: false,
    warning: false,
    error: false,
    send_error: false,
    send_success: false,
    wrong_pswd: false,
    wrong_login: false,
    publicKey: null,
    secretKey: null,
    balance: NaN
  }

  if(!params) {
    return global_states;
  }

  var objkeys = Object.keys(params)
  var objvalues = Object.keys(params).map(function(key) {
    return params[key];
  });


  for(i=0; i < objkeys.length; i++) {

    global_states[objkeys[i]] = objvalues[i];
    
  }
  return global_states;
  
}


express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json())         
  .use(bodyParser.urlencoded({ extended: true }))
  .use(session(sess))     
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')


  .get('/', (req, res) => {

    if(req.session.views) {
      res.render('pages/index', global_states({publicKey: pKey, secretKey: sKey, balance: balanceAmount}))
    } else {
      res.render('pages/index', global_states())
    }

  })

  .post('/info', (req, res) => {

    res.end()

  })

  //$POST_NEW_ACCOUNT
  .post('/new_account', (req, res) => {
  	var pair = StellarSdk.Keypair.random();
    if(!req.session.views) {
      var password = req.body.choose_password
      if(password && password.length >= 8) {
        request.get({
          url: 'https://horizon-testnet.stellar.org/friendbot',
          qs: { addr: pair.publicKey()},
          json: true
        }, function(error, response, body) {
          if (error || response.statusCode !== 200) {
            console.error('ERROR!', error || body);
            res.render('pages/index', global_states({error: true}))
          }
          else {
            const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
            server.loadAccount(pair.publicKey())
              .then(function(account) { 
                global_param = account;
                pKey = pair.publicKey()
                sKey = pair.secret()
                balanceAmount = account.balances[0].balance
                dbase.collection("key_stores").insertOne({pswd: password, pkey: pKey}, (err,res) => {
                  if (err) throw err;
                })
                req.session.views = {}
                res.render('pages/index', global_states({success: true, publicKey: pKey, secretKey: sKey, balance: balanceAmount}))
                res.end()
              });
          }
        })
      } else {
        console.log("password not valid")
        res.render('pages/index', global_states({wrong_pswd: true}))
        res.end()
      }
    } else {
      res.render('pages/index', global_states({warning: true, publicKey: pKey, secretKey: sKey, balance: balanceAmount}))
      res.end()
    }





  })
  
  //$POST_SEND_XLM
  .post('/send', (req, res) => {
    
    StellarSdk.Network.useTestNetwork()
    var server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
    var sourceKeys;
    var destinationId;
    var amount;
    var transaction
    if(req.body.sender && req.body.beneficiary && req.body.amount) {

        sourceKeys = StellarSdk.Keypair.fromSecret(req.body.sender)
        destinationId = req.body.beneficiary
        amount = req.body.amount
        server.loadAccount(destinationId)

          .catch(StellarSdk.NotFoundError, function(error) {
            throw new Error('Destination Account Not Found');
            res.render('pages/index', global_states({send_error: true}))
            res.end()
          })

          .then(function() {
            return server.loadAccount(sourceKeys.publicKey());
          })

          .then(function(sourceAccount) {
              transaction = new StellarSdk.TransactionBuilder(sourceAccount)
                  .addOperation(StellarSdk.Operation.payment({
                      destination: destinationId,
                      asset: StellarSdk.Asset.native(),
                      amount: amount
                  }))
                  .addMemo(StellarSdk.Memo.text('test'))
                  .build();
                  transaction.sign(sourceKeys);
                  console.log("Satus: Sign")
                  server.submitTransaction(transaction).then(function(transactionResult){
                    console.log(transactionResult)
                    res.render('pages/index', global_states({send_success: true}))
                    res.end()
                  }).catch(function(transactionResult) {
                      res.render('pages/index', global_states({send_error: true}))
                      res.end()
                  });              
                  console.log(server.submitTransaction(transaction));
                  
          })
        .catch(function(error) {
          console.error('Something went wrong!', error);
          res.render('pages/index', global_states({send_error: true}))
          res.end()
        });

    } else {
      res.render('pages/index', global_states({send_error: true}))
      res.end()
    }  

      
  })

  .post('/login', (req, res) => {
    var balanceAmount
    var server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
    var password = req.body.insert_password
    var account = req.body.insert_publickey
    console.log(account)
    dbase.collection("key_stores").find({pswd: password, pkey: account}).toArray((err, result) => {
      if(result.length <= 0) {
        res.render('pages/index', global_states({wrong_login: true}));
        res.end()
      } 
      else {
        server.loadAccount(account).then(function(sourceAccount){
            balanceAmount = sourceAccount.balances[0].balance
            res.render('pages/index', global_states({publicKey: account, balance: balanceAmount}))
            res.end()
        }) 
      }
    })

  })


  .get('/db', (req, res) => res.render('pages/db'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
