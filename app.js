var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
var tableStorage;
if(process.env['AzureWebJobsStorage']) {
    var tableName = 'hypeusers';
    var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
    tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
} else {
    tableStorage = new builder.MemoryBotStorage();
}

// Create your bot with a function to receive messages from the user
// This default message handler is invoked if the user's utterance doesn't
// match any intents handled by other dialogs.
var bot = new builder.UniversalBot(connector,
    
    function(session,results) {

     session.send("Hi! I'm the BI Bot. I able to give you on insights on Hype products Live");

    // If the object for storing notes in session.userData doesn't exist yet, initialize it
    }
);

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
bot.recognizer(recognizer);

// Add a dialog for each intent that the LUIS app recognizes.
// See https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-recognize-intent-luis 

// CreateNote dialog

bot.dialog('firstRun', function (session) {    
    session.userData.firstRun = true;
    var currentUser = session.message.address.user.name; 
    var welcomeMsg = 'Welcome %s to Sella Bi Bot, i am trained to give you BI insights on all Hype products!, Type Hype or any question on Hype insights'
    session.send(welcomeMsg,currentUser).endDialog();
}).triggerAction({
    onFindAction: function (context, callback) {
        // Only trigger if we've never seen user before
        if (!context.userData.firstRun) {
            // Return a score of 1.1 to ensure the first run dialog wins
            callback(null, 1.1);
        } else {
            callback(null, 0.0);
        }
    }
});



bot.dialog('Bi.Hype.Greet', [
    function (session, args, next) {
        // Resolve and store any Bi.Hype.Greet entity passed from LUIS.
        var intent = args.intent;
        var hypeTimeLine = builder.EntityRecognizer.findEntity(intent.entities, 'builtin.datetimeV2.date');

        var hypeType = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Hype.Type');
        var currentUser = session.message.address.user.name; 
        session.dialogData.hype = {
            timeLine: hypeTimeLine ? hypeTimeLine.entity : 'today',
            type : hypeType ? hypeType.entity : 'hype start'
        };
        var hype = session.dialogData.hype;
        //session.send('Hi %s, collecting information **on %s for %s**',currentUser, hype.type, hype.timeLine);
        session.sendTyping();
        //TODO - use proactive message.
        setTimeout(() => {
            if(hype.type && (hype.type.toLowerCase() == 'hype' ||  hype.type.toLowerCase() == 'hype start')) {
                hype.stats = {
                    newProspects : 1000,
                    average : 800,
                    highest : true,
                    lowest : false,
                }
            } else {
                hype.stats = {
                    newProspects : 200,
                    average : 500,
                    highest : false,
                    lowest : true,
                }
            }
            if(hype.stats.newProspects > hype.stats.average) {
                if(hype.stats.highest) {
                    session.send('on %s we have **%s New prospects** created for **%s**, it is a **Highest** for this month and it is **above average of %s**', 
                    hype.timeLine,hype.stats.newProspects,hype.type, hype.stats.average);
                } else {
                    session.send('on %s we have **%s New prospects** created for **%s**, it is **above average of %s**', 
                    hype.timeLine,hype.stats.newProspects,hype.type, hype.stats.average);
                }
            } else {
                if(hype.stats.lowest) {
                    session.send('on %s we have **%s New prospects** created for **%s**, **it is a Lowest for this month**', 
                    hype.timeLine,hype.stats.newProspects,hype.type, hype.stats.average);
                } else {
                    session.send('on %s we have **%s New prospects** created for **%s**, it is **inline with average of %s**', 
                    hype.timeLine,hype.stats.newProspects,hype.type, hype.stats.average);
                }                    
            }
        }, 3000);
    }
]).triggerAction({ 
    matches: 'Bi.Hype.Greet'
})

bot.dialog('Bi.Hype.Trend', [
    function (session, args, next) {
        // Resolve and store any Bi.Hype.Greet entity passed from LUIS.
        var intent = args.intent;
        var hypeTimeLine = builder.EntityRecognizer.findEntity(intent.entities, 'builtin.datetimeV2.date');
        var hypeType = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Hype.Type');
        var currentUser = session.message.address.user.name; 

        session.dialogData.hype = {
            timeLine: hypeTimeLine ? hypeTimeLine.entity : 'this week',
            type : hypeType ? hypeType.entity : 'hype start'
        };
        var hype = session.dialogData.hype;
        //session.send('Hi %s, collecting trend **on %s for %s**',currentUser, hype.type, hype.timeLine);
        session.sendTyping();
        //TODO - use proactive message.
        setTimeout(() => {
            hype.trend = {
                prospects : [ {
                    date : '25/4/2018',
                    count : '1000'
                },
                {
                    date : '24/4/2018',
                    count : '980'
                },
                {
                    date : '23/4/2018',
                    count : '996'
                }],
                link  : {
                     url : 'http://bing.com', 
                     image : 'http://aka.ms/Fo983c' 
                }
            }
            session.send('Recent trends for %s \n * %s -> %s \n * %s -> %s \n * %s -> %s \n\n [For more ...](%s) \n\n ![%s](%s)',
                    hype.type, hype.trend.prospects[0].date, hype.trend.prospects[0].count,
                    hype.trend.prospects[1].date, hype.trend.prospects[1].count,
                    hype.trend.prospects[2].date, hype.trend.prospects[2].count,
                    hype.trend.link.url,
                    hype.type,hype.trend.link.image);
        }, 3000);
    }
]).triggerAction({ 
    matches: 'Bi.Hype.Trend'
})

bot.dialog('Bi.System.Monitor', [
    function (session, args, next) {
        // Resolve and store any Bi.Hype.Greet entity passed from LUIS.
        var intent = args.intent;
        var currentUser = session.message.address.user.name; 
        if(currentUser.toLowerCase() == 'arul' || currentUser.toLowerCase() == 'user') 
        {
            var server = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.System.Server');
            session.dialogData.systemUsage = {
                server : server ? server : 'dcprdp',
                nodes : [
                    { 
                        name : 'dcprdp01',
                        cpu : '7%',
                        availablity : '100%',
                        avgResponse : '200ms'
                    },
                    { 
                        name : 'dcprdp02',
                        cpu : '6%',
                        availablity : '100%',
                        avgResponse : '210ms'
                    }, 
                    { 
                        name : 'dcprdp03',
                        cpu : '10%',
                        availablity : '100%',
                        avgResponse : '220ms'
                    }                 
                ],
                link  : {
                    url : 'http://bing.com', 
                    image : 'http://aka.ms/Fo983c' 
               } 
            };
            var systemUsage = session.dialogData.systemUsage;
            session.sendTyping();
            session.send('**%s** \n '+ 
                         '* CPU -> %s \n '+ 
                         '* availablity -> %s \n ' +
                         '* avgResponse -> %s \n\n ' +
                         '\n **%s** \n '+
                         '* CPU -> %s \n '+ 
                         '* availablity -> %s \n ' +
                         '* avgResponse -> %s \n\n ' +
                         '\n **%s** \n '+
                         '* CPU -> %s \n '+ 
                         '* availablity -> %s \n ' +
                         '* avgResponse -> %s \n\n ' +
                         '[For more ...](%s) \n\n' + 
                         '![%s](%s)',
                    systemUsage.nodes[0].name, 
                    systemUsage.nodes[0].cpu,
                    systemUsage.nodes[0].availablity, 
                    systemUsage.nodes[0].avgResponse,
                    systemUsage.nodes[1].name,
                    systemUsage.nodes[1].cpu,
                    systemUsage.nodes[1].availablity, 
                    systemUsage.nodes[1].avgResponse,
                    systemUsage.nodes[2].name,
                    systemUsage.nodes[2].cpu,
                    systemUsage.nodes[2].availablity, 
                    systemUsage.nodes[2].avgResponse,
                    systemUsage.link.url,
                    systemUsage.server,
                    systemUsage.link.image);
        } else {
            session.send('Sorry required a system admin profile to fetch system usage')
        }
    }
        
]).triggerAction({
    matches : 'Bi.System.Monitor'
})

/*bot.dialog('CreateNote', [
    function (session, args, next) {
        // Resolve and store any Note.Title entity passed from LUIS.
        var intent = args.intent;
        var title = builder.EntityRecognizer.findEntity(intent.entities, 'Note.Title');

        var note = session.dialogData.note = {
          title: title ? title.entity : null,
        };
        
        // Prompt for title
        if (!note.title) {
            builder.Prompts.text(session, 'What would you like to call your note?');
        } else {
            next();
        }
    },
    function (session, results, next) {
        var note = session.dialogData.note;
        if (results.response) {
            note.title = results.response;
        }

        // Prompt for the text of the note
        if (!note.text) {
            builder.Prompts.text(session, 'What would you like to say in your note?');
        } else {
            next();
        }
    },
    function (session, results) {
        var note = session.dialogData.note;
        if (results.response) {
            note.text = results.response;
        }
        
        // If the object for storing notes in session.userData doesn't exist yet, initialize it
        if (!session.userData.notes) {
            session.userData.notes = {};
            console.log("initializing session.userData.notes in CreateNote dialog");
        }
        // Save notes in the notes object
        session.userData.notes[note.title] = note;

        // Send confirmation to user
        session.endDialog('Creating note named "%s" with text "%s"',
            note.title, note.text);
    }
]).triggerAction({ 
    matches: 'Note.Create',
    confirmPrompt: "This will cancel the creation of the note you started. Are you sure?" 
}).cancelAction('cancelCreateNote', "Note canceled.", {
    matches: /^(cancel|nevermind)/i,
    confirmPrompt: "Are you sure?"
});

bot.dialog('DeleteNote', [
    function (session, args, next) {
        if (noteCount(session.userData.notes) > 0) {
            // Resolve and store any Note.Title entity passed from LUIS.
            var title;
            var intent = args.intent;
            var entity = builder.EntityRecognizer.findEntity(intent.entities, 'Note.Title');
            if (entity) {
                // Verify that the title is in our set of notes.
                title = builder.EntityRecognizer.findBestMatch(session.userData.notes, entity.entity);
            }
            
            // Prompt for note name
            if (!title) {
                builder.Prompts.choice(session, 'Which note would you like to delete?', session.userData.notes);
            } else {
                next({ response: title });
            }
        } else {
            session.endDialog("No notes to delete.");
        }
    },
    function (session, results) {
        delete session.userData.notes[results.response.entity];        
        session.endDialog("Deleted the '%s' note.", results.response.entity);
    }
]).triggerAction({
    matches: 'Note.Delete'
}).cancelAction('cancelDeleteNote', "Ok - canceled note deletion.", {
    matches: /^(cancel|nevermind)/i
});

bot.dialog('ReadNote', [
    function (session, args, next) {
        if (noteCount(session.userData.notes) > 0) {
           
            // Resolve and store any Note.Title entity passed from LUIS.
            var title;
            var intent = args.intent;
            var entity = builder.EntityRecognizer.findEntity(intent.entities, 'Note.Title');
            if (entity) {
                // Verify it's in our set of notes.
                title = builder.EntityRecognizer.findBestMatch(session.userData.notes, entity.entity);
            }
            
            // Prompt for note name
            if (!title) {
                builder.Prompts.choice(session, 'Which note would you like to read?', session.userData.notes);
            } else {
                next({ response: title });
            }
        } else {
            session.endDialog("No notes to read.");
        }
    },
    function (session, results) {        
        session.endDialog("Here's the '%s' note: '%s'.", results.response.entity, session.userData.notes[results.response.entity].text);
    }
]).triggerAction({
    matches: 'Note.ReadAloud'
}).cancelAction('cancelReadNote', "Ok.", {
    matches: /^(cancel|nevermind)/i
});


function noteCount(notes) {

    var i = 0;
    for (var name in notes) {
        i++;
    }
    return i;
} */