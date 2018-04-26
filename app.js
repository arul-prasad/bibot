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

     session.send("Hi! I'm the Sella Enterprise Bot, not able to understand your request, will be trained and able to response");

    // If the object for storing notes in session.userData doesn't exist yet, initialize it
    }
);

bot.set('storage', tableStorage);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId || 'f9efdacc-aee8-491a-9236-8daac572a551';
var luisAPIKey = process.env.LuisAPIKey || 'd4f4113afc974a5bbcd6eb0489c921a4';
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
    var welcomeMsg = 'Welcome %s to Sella Enterprise Bot, Type your question for your information hands on'
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
                    date : '26/4/2018',
                    count : '1000'
                },
                {
                    date : '25/4/2018',
                    count : '980'
                },
                {
                    date : '24/4/2018',
                    count : '996'
                }],
                link  : {
                     url : 'https://x-net.bansel.it/onboarding/hype/trends', 
                     image : 'https://i.imgur.com/BFHqAEI.png' 
                }
            }
            session.send('new prospects trends for **%s** on **%s** \n * %s -> %s \n * %s -> %s \n * %s -> %s \n\n [For more ...](%s) \n\n ![%s](%s)',
                    hype.type, hype.timeLine, hype.trend.prospects[0].date, hype.trend.prospects[0].count,
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
        if(currentUser.toLowerCase() == 'arul prasad' || currentUser.toLowerCase() == 'user') 
        {
            session.sendTyping();
            var server = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.System.Server');
            setTimeout(() => {
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
                        url : 'https://www.manageengine.com/network-monitoring/images/network-performance-monitoring.gif', 
                        image : 'https://www.manageengine.com/network-monitoring/images/network-performance-monitoring.gif' 
                } 
                };
                var systemUsage = session.dialogData.systemUsage;
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
                    },3000);
                } else {
                    session.send('Sorry required a system admin profile to fetch system usage')
                }
    }
        
]).triggerAction({
    matches : 'Bi.System.Monitor'
})


bot.dialog("Bi.Normative.Query", [
    function(session, args, next) {
        // Resolve and store any Bi.Normative.Greet entity passed from LUIS.
        var intent = args.intent;
        var currentUser = session.message.address.user.name; 
        var normativeProduct = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Normative.Product');
        session.sendTyping();
        setTimeout( () => {
            session.dialogData.normativeData = {
                yammerConversations : ['https://www.yammer.com/sella.it/threads/978252414' , 
                        'https://www.yammer.com/sella.it/threads/1057172054',
                        'https://www.yammer.com/sella.it/threads/1040266535'],
                normativeProduct : normativeProduct ? normativeProduct.entity : 'gdpr',
                urls : ['https://www.csoonline.com/article/3202771/data-protection/general-data-protection-regulation-gdpr-requirements-deadlines-and-facts.html',
                        'https://en.wikipedia.org/wiki/General_Data_Protection_Regulation']
            };
            var normativeData = session.dialogData.normativeData;
            session.send('here are the **regulations for %s** yammer conversations are %s \n %s \n %s \n \n other resources are \n %s \n %s ', 
                normativeData.normativeProduct, 
                normativeData.yammerConversations[0],
                normativeData.yammerConversations[1],
                normativeData.yammerConversations[2], 
                normativeData.urls[0], 
                normativeData.urls[1]);
        }, 2000)
    }
]).triggerAction({
    matches : 'Bi.Normative.Query'
});


bot.dialog("Bi.Phone.Query", [
    function(session, args, next) {
        // Resolve and store any Bi.Normative.Greet entity passed from LUIS.
        var intent = args.intent;
        var currentUser = session.message.address.user.name; 
        var phoneUser = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Phone.User');
        if(!session.dialogData.phoneUserData) {
            session.dialogData.phoneUserData = {}
        }
        session.sendTyping();
        if(phoneUser || session.dialogData.phoneUserData.user) {
            setTimeout(() => {
                session.dialogData.phoneUserData = {
                    user : phoneUser ? phoneUser : '',
                    extension : 46
                };
                var phoneUserData = session.dialogData.phoneUserData;
                session.send('extension Pier %s ', phoneUserData.extension);
            },3000);
        } else {
            builder.Prompts.text(session, 'give me the name of person to search his extension');
            next();
        }
    } , 

    function (session, results, next) {
        var phoneUserData = session.dialogData.phoneUserData;
        if (results.response) {
            phoneUserData.user = results.response;
            session.sendTyping();
            if(phoneUserData.user) {
                phoneUserData.extension = 46
                setTimeout(() => {
                    session.send('extension Pier %s ', phoneUserData.extension);
                },3000);
            }
        }
    },
]).triggerAction({
    matches : 'Bi.Phone.Query'
});

bot.dialog("Bi.HR.Reporting", [
    function(session, args, next) {
        // Resolve and store any Bi.Normative.Greet entity passed from LUIS.
        var intent = args.intent;
        var currentUser = session.message.address.user.name; 
        var user = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.HR.User');
        if(!session.dialogData.user) {
            session.dialogData.user = { }
        }
        session.sendTyping();
        setTimeout(() => {
            if(session.dialogData.user == 'arul prasad') {
                session.dialogData.user = {
                    name : user ? user : currentUser,
                    manager : 'Sudhakar',
                    area : 'IT CanaliDigitale'
                };
            }else {
                session.dialogData.user = {
                    name : user ? user : currentUser,
                    manager : 'Barath',
                    area : 'IT Sispe'
                };
            } 
            var userData = session.dialogData.user;
            session.send('%s reporting to %s working in %s', userData.name, userData.manager, userData.area);
        },3000);
    } 
]).triggerAction({
    matches : 'Bi.HR.Reporting'
});

bot.dialog("Bi.HR.Responsible", [
    function(session, args, next) {
        // Resolve and store any Bi.Normative.Greet entity passed from LUIS.
        var intent = args.intent;
        var currentUser = session.message.address.user.name; 
        var area = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Hr.Area');
        var project = builder.EntityRecognizer.findEntity(intent.entities, 'Bi.Hr.Project');
        if(!session.dialogData.responsible) {
            session.dialogData.responsible = {
                user : currentUser,
                area : area ? area.entity : '' ,
                name : 'Sudhakar',
                project : project ? project.entity : ''
            };
        }

        if(area) {
            session.sendTyping();
            setTimeout(() => {
                session.send('%s is responsible for %s', 
                    session.dialogData.responsible.name,
                    session.dialogData.responsible.area);
            },3000);
        } else if(project) {
            session.sendTyping();
            setTimeout(() => {
                session.send('%s is responsible for %s',
                    session.dialogData.responsible.name, 
                    session.dialogData.responsible.project);
            },3000);
        }
    } 
]).triggerAction({
    matches : 'Bi.HR.Responsible'
});


bot.dialog("Bi.Apm.SOA", [
    function(session, args, next) {
        // Resolve and store any Bi.Normative.Greet entity passed from LUIS.
        setTimeout(() => {
            session.dialogData.soaStats 
            session.send('%s is responsible for %s',
            session.dialogData.responsible.name, 
            session.dialogData.responsible.project);
        },3000);
    }
]).triggerAction({
    matches : 'Bi.Apm.SOA'
});