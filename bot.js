const Twit = require('twit');
const fs = require('fs');
var https = require('https');
const base64 = require('node-base64-image');
var request = require('request').defaults({ encoding: null });
var rp = require('request-promise');

var T = new Twit({
  consumer_key:         process.env.BOT_CONSUMER_KEY,
  consumer_secret:      process.env.BOT_CONSUMER_SECRET,
  access_token:         process.env.BOT_ACCESS_TOKEN,
  access_token_secret:  process.env.BOT_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000  // optional HTTP request timeout
})


var url = "https://tcrf.net/api.php?action=query&generator=random&grnnamespace=6&prop=imageinfo&list=categorymembers&cmtitle=Category:Screenshots&iiprop=url&iiurlwidth=750&format=json";
var descURL = "https://tcrf.net/api.php?action=query&generator=fileusage&prop=info&format=json&titles="


var b64content;
var imageSRC;
var pageSRC;
var pageTitle;

var options = {
    uri: url,
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true 
};


process.on('beforeExit', code => {
  setTimeout(() => {
    process.exit(1)
  }, 100)
})

process.on('exit', code => {
  console.log(`Process exited with code: ${code}`)
})

rp(options).then(function (response) {
  var pages = response.query.pages;  
  var cats = response.query.categorymembers;  

  for (var id in pages) {
    imageSRC = pages[id].imageinfo[0].thumburl;
    pageSRC = pages[id].imageinfo[0].descriptionshorturl;
    pageTitle = pages[id].title;
  }

  console.log(imageSRC);
  
  if(pageTitle.toLowerCase().endsWith("ogg") || pageTitle.toLowerCase().endsWith("mp3") || pageTitle.toLowerCase().endsWith("wav")){
    console.log('Not screenshot, try again later.');
    process.exit(0);
  }
  else{

    options = {
      uri: encodeURI(descURL+pageTitle) +"&",
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true 
    };

    console.log(encodeURI(descURL+pageTitle))
    rp(options).then(function (response) {
      var pages = response.query.pages;  
      var usagePageTitle = ""; 
      for (var id in pages) {
        usagePageTitle = pages[id].title;
      }
      request.get(imageSRC, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          
          b64content =  Buffer.from(body).toString('base64');

          T.post('media/upload', { media_data: b64content }, function (err, data, response) {
            var mediaIdStr = data.media_id_string
            var altText = pageTitle
            var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }
            T.post('media/metadata/create', meta_params, function (err, data, response) {
              if (!err) {
                
                var params = { status: pageTitle + " from "+ usagePageTitle + " (and maybe others) found at #TCRF " + pageSRC , media_ids: [mediaIdStr] }

                T.post('statuses/update', params, function (err, data, response) {
                  console.log(err)
                  console.log('I think I posted!');
                  process.exit(0);
                })
              }
              else{
                console.log('Caught error: ', err.stack);
                process.exit(0);
              }
            })
          })
        }
      });
    })
  }
})




